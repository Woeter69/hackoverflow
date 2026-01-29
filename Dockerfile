# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY .env ../.env
COPY frontend/ .
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app

# Install git for fetching dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Stage 3: Final
FROM alpine:latest

WORKDIR /app

# Install CA certificates for external HTTPS calls
RUN apk --no-cache add ca-certificates

# Copy binary from backend-builder
COPY --from=backend-builder /app/main .

# Copy frontend assets from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./dist

# Expose the application port
EXPOSE 8080

# Run the binary
CMD ["./main"]