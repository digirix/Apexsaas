import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { TaskScheduler } from "./task-scheduler";
import { runDatabaseMigrations, seedDefaultData } from "./db-migration-simple";

function startTaskScheduler() {
  // Initialize task scheduler
  const taskScheduler = new TaskScheduler(storage);
  
  // Run task generation immediately on server start
  taskScheduler.generateUpcomingRecurringTasks()
    .then(() => {
      console.log("Initial recurring task generation completed");
    })
    .catch(err => {
      console.error("Error during initial recurring task generation:", err);
    });
  
  // Schedule recurring task generation to run daily at midnight
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    const now = new Date();
    console.log(`Running scheduled recurring task generation (${now.toISOString()})`);
    
    taskScheduler.generateUpcomingRecurringTasks()
      .then(() => {
        console.log("Scheduled recurring task generation completed");
      })
      .catch(err => {
        console.error("Error during scheduled recurring task generation:", err);
      });
  }, ONE_DAY_MS);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("Starting server...");
  try {
    // Run database migrations
    console.log("Initializing database...");
    const migrationSuccess = await runDatabaseMigrations();
    if (!migrationSuccess) {
      console.error("Database migration failed. Server will not start.");
      process.exit(1);
    }
    
    // Seed default data if needed
    await seedDefaultData();
    console.log("Database initialization completed");

    console.log("Registering routes...");
    const server = await registerRoutes(app);
    console.log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error in middleware:", err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("Setting up Vite in development mode...");
      await setupVite(app, server);
      console.log("Vite setup complete");
    } else {
      console.log("Setting up static serving...");
      serveStatic(app);
      console.log("Static serving setup complete");
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    console.log(`Attempting to listen on port ${port}...`);
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying to find an alternative port...`);
        // Try ports 5001-5010
        for (let altPort = 5001; altPort <= 5010; altPort++) {
          try {
            server.listen({
              port: altPort,
              host: "0.0.0.0",
            }, () => {
              log(`Server started successfully on alternative port ${altPort}`);
              startTaskScheduler();
            });
            return;
          } catch (e) {
            continue;
          }
        }
        console.error('Could not find an available port. Please check for running processes.');
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
    
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server started successfully on port ${port}`);
      startTaskScheduler();
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
})();
