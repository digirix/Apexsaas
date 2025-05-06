#!/bin/bash

# Script to push MySQL schema to database
echo "Pushing MySQL schema to database..."
npx drizzle-kit push:mysql --config=drizzle.mysql.config.ts
echo "Running direct schema push..."
npx tsx push-mysql-schema.ts
echo "MySQL schema push complete"