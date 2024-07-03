
#!/bin/bash

# Default instance value
instance="dev"
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

echo "-------------------------------------- INIT SCRIPT --------------------------------------"
echo "Dont forget to set the environment variables in the .env file and the .env.local file!!"
echo "Before running this script, make sure you have installed pm2 globally with npm install -g pm2"
echo "-----------------------------------------------------------------------------------------"

# This script is used to initialize the project
echo "-------------------------------------- INIT SCRIPT --------------------------------------"
echo "Initializing the project..."
echo "-----------------------------------------------------------------------------------------"
pnpm install

# This script is used to generate the prisma client and schema
echo "-------------------------------------- PRISMA SCRIPT ------------------------------------"
echo "Generating the prisma client and schema..."
echo "-----------------------------------------------------------------------------------------"
pnpm prisma generate

# This script is used to initialize the database
echo "-------------------------------------- PRISMA - DB PUSH SCRIPT --------------------------"
echo "Initializing the database..."
echo "-----------------------------------------------------------------------------------------"
pnpm prisma db push

# This script is used to seed the database with default data
echo "-------------------------------------- PRISMA - DB SEED SCRIPT --------------------------"
echo "Seeding the database..."
echo "-----------------------------------------------------------------------------------------"
pnpm prisma db seed 

# This script builds the project
echo "-------------------------------------- BUILD SCRIPT -------------------------------------"
echo "Building the project..."
echo "-----------------------------------------------------------------------------------------"
pnpm run build

# This script is used to start the server
echo "-------------------------------------- START SCRIPT --------------------------------------"
echo "Starting the server..."
echo " Instance: https://$instance.nextcrm.online"
echo " Port: $port"
echo "------------------------------------------------------------------------------------------"
pm2 start pnpm --name "nextcrm-$instance" -- start --port $port
pm2 save