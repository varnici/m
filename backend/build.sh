#!/bin/bash
# Docker build script with buildx caching for 2M user scale infrastructure
# Handles network timeouts gracefully and optimizes for CI/CD

set -e

BUILD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="${DOCKER_REGISTRY:-localhost}"
BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Mapvo Backend Docker Build Script ===${NC}"
echo "Registry: $REGISTRY"
echo "Buildkit Progress: $BUILDKIT_PROGRESS"
echo ""

# Create buildx builder instance if it doesn't exist
BUILDER_NAME="mapvo-builder"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo -e "${YELLOW}Creating buildx builder: $BUILDER_NAME${NC}"
    docker buildx create --name "$BUILDER_NAME" --use
else
    echo -e "${GREEN}Using existing buildx builder: $BUILDER_NAME${NC}"
    docker buildx use "$BUILDER_NAME"
fi

# Function to build service
build_service() {
    local service_name=$1
    local service_path=$2
    local build_args=${3:-""}
    
    echo -e "${YELLOW}Building $service_name...${NC}"
    
    BUILD_CMD="docker buildx build"
    BUILD_CMD="$BUILD_CMD --builder $BUILDER_NAME"
    BUILD_CMD="$BUILD_CMD --progress $BUILDKIT_PROGRESS"
    BUILD_CMD="$BUILD_CMD -t ${REGISTRY}/mapvo-${service_name}:latest"
    BUILD_CMD="$BUILD_CMD -t ${REGISTRY}/mapvo-${service_name}:$(git rev-parse --short HEAD 2>/dev/null || echo 'dev')"
    BUILD_CMD="$BUILD_CMD --load"  # Load into local Docker
    
    if [ -n "$build_args" ]; then
        while IFS='=' read -r key value; do
            BUILD_CMD="$BUILD_CMD --build-arg $key=$value"
        done <<< "$build_args"
    fi
    
    BUILD_CMD="$BUILD_CMD $service_path"
    
    if eval "$BUILD_CMD"; then
        echo -e "${GREEN}✓ $service_name built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build $service_name${NC}"
        return 1
    fi
}

# Build all services with retry logic
SERVICES=(
    "core-banking:./services/core-banking"
    "ai-ml-service:./services/ai-ml-service"
    "rag-service:./services/rag-service:INSTALL_RAG_OPTIONAL=false"
    "ussd-service:./services/ussd-service"
    "api-gateway:./services/api-gateway"
    "notification-service:./services/notification-service"
)

FAILED_SERVICES=()

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name path args <<< "$service"
    
    retry_count=0
    max_retries=3
    
    while [ $retry_count -lt $max_retries ]; do
        if build_service "$name" "$path" "$args"; then
            break
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}Retry $retry_count/$max_retries for $name...${NC}"
                sleep 5
            else
                FAILED_SERVICES+=("$name")
            fi
        fi
    done
done

echo ""
echo -e "${GREEN}=== Build Summary ===${NC}"

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}All services built successfully! ✓${NC}"
    exit 0
else
    echo -e "${RED}Failed to build the following services:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "  - $service"
    done
    exit 1
fi
