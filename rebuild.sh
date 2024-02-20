#!/bin/bash

# ###################################################################################
#                                                                                   #       
# This script rebuilds the Next.js app and restarts the PM2 process with the latest #
# changes. It also updates the Prisma scheme and seeds the database.                #
#                                                                                   #
# ###################################################################################

# Exit immediately if any command exits with a non-zero status
set -e

# Parsing command-line options
while getopts ":v:" opt; do
  case $opt in
    v)
      variable="$OPTARG"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      exit 1
      ;;
  esac
done

# Exit if variable is not provided
if [ -z "$variable" ]; then
  echo "Error: App instances not provided. Use the -v option."
  exit 1
fi

# Accessing the variable passed via the command line
echo "Run for app instances: $variable"

# Stopping PM2 process
echo "Stopping PM2 process: $variable"
pm2 stop $variable

# Git actions
echo "Git actions"
git fetch
git pull

# Rebuilding Next.js App
echo "Rebuilding Next.js App"

# Install dependencies
pnpm install

# Update Prisma scheme
pnpm prisma db push

# Seed DB
pnpm prisma db seed

# Build Next.js App
pnpm build

# Start PM2 process
echo "Start PM2 process: $variable"
pm2 start $variable

echo "Script completed successfully."