#!/bin/bash
# Quick start script for development with retry logic for network timeouts
# Usage: ./quick-build.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}${BOLD}=== Mapvo Backend Quick Build ===${NC}"

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Configuration
MAX_RETRIES=3
RETRY_DELAY=10

# Function to retry command with exponential backoff
retry_command() {
    local cmd=$1
    local desc=$2
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        echo -e "${YELLOW}$desc (Attempt $((retries + 1))/$MAX_RETRIES)...${NC}"
        
        if eval "$cmd"; then
            echo -e "${GREEN}✓ $desc succeeded${NC}"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            WAIT_TIME=$((RETRY_DELAY * retries))
            echo -e "${YELLOW}Waiting ${WAIT_TIME}s before retry...${NC}"
            sleep $WAIT_TIME
        fi
    done
    
    echo -e "${RED}✗ $desc failed after $MAX_RETRIES attempts${NC}"
    return 1
}

# Pre-flight checks
echo -e "${BOLD}Pre-flight checks:${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}docker-compose not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ docker-compose found${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found, using defaults${NC}"
fi

# Create .dockerignore if missing
if [ ! -f ".dockerignore" ]; then
    echo -e "${YELLOW}Creating .dockerignore...${NC}"
    touch .dockerignore
fi

# Set build variables
export BUILDKIT_PROGRESS=plain
export DOCKER_BUILDKIT=1

# Build with retry
echo -e "${BOLD}Building services:${NC}"

retry_command \
    "docker-compose build --no-cache" \
    "Docker Compose Build"

# Show build results
echo ""
echo -e "${GREEN}${BOLD}=== Build Complete ===${NC}"
echo -e "${GREEN}Services are ready to run!${NC}"
echo ""
echo -e "Next steps:"
echo -e "  ${BOLD}Start services:${NC} docker-compose up -d"
echo -e "  ${BOLD}Check status:${NC}  docker-compose ps"
echo -e "  ${BOLD}View logs:${NC}     docker-compose logs -f"
echo ""
