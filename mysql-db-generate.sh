#!/bin/bash

# Script to generate MySQL migration files
echo "Generating MySQL migration files..."
npx drizzle-kit generate:mysql --config=drizzle.mysql.config.ts
echo "MySQL migration files generation complete"