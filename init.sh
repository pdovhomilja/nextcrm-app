#!/bin/bash
# Default port value
port="3000"

# Parsing command-line options
while getopts ":i:p:" opt; do
  case $opt in
    i)
      instance="$OPTARG"
      ;;
    p)
      port="$OPTARG"
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

# This script is used to initialize the project
npm install

# This script builds the project
npm run build

# This script is used to generate the prisma client and schema
npx prisma genereate

# This script is used to initialize the database
npx prisma db push

# This script is used to seed the database with default data
npx prisma db seed 

# This script is used to start the server
pm2 start npm --name "nextcrm-$instance" -- start -- --port $port