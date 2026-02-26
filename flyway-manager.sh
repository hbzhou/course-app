#!/bin/bash

# Flyway CLI Setup Script
# Downloads and configures Flyway CLI for database migration management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flyway version
FLYWAY_VERSION="10.10.0"
FLYWAY_DIR="./flyway-${FLYWAY_VERSION}"
FLYWAY_URL="https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}.tar.gz"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check if Flyway is already installed
check_existing() {
    if [ -d "$FLYWAY_DIR" ]; then
        print_warning "Flyway ${FLYWAY_VERSION} is already installed in $FLYWAY_DIR"
        read -p "Do you want to reinstall? (yes/no): " reinstall
        if [ "$reinstall" != "yes" ]; then
            print_info "Using existing installation"
            configure_flyway
            show_usage
            exit 0
        fi
        print_info "Removing existing installation..."
        rm -rf "$FLYWAY_DIR"
    fi
}

# Function to download Flyway CLI
download_flyway() {
    print_step "Downloading Flyway CLI ${FLYWAY_VERSION}..."

    if command -v curl &> /dev/null; then
        curl -L "$FLYWAY_URL" -o "flyway-${FLYWAY_VERSION}.tar.gz"
    elif command -v wget &> /dev/null; then
        wget "$FLYWAY_URL" -O "flyway-${FLYWAY_VERSION}.tar.gz"
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    print_info "Download complete"
}

# Function to extract Flyway
extract_flyway() {
    print_step "Extracting Flyway CLI..."
    tar -xzf "flyway-${FLYWAY_VERSION}.tar.gz"
    rm "flyway-${FLYWAY_VERSION}.tar.gz"
    print_info "Extraction complete"
}

# Function to configure Flyway
configure_flyway() {
    print_step "Configuring Flyway..."

    # Create flyway.conf file
    cat > "$FLYWAY_DIR/conf/flyway.conf" << 'EOF'
# Flyway Configuration for course-app
# Database connection settings

flyway.url=jdbc:mysql://localhost:3306/coursedb
flyway.user=admin
flyway.password=welcome123
flyway.driver=com.mysql.cj.jdbc.Driver

# Migration locations
flyway.locations=filesystem:./api/src/main/resources/db/migration

# Schema settings
flyway.schemas=coursedb

# Baseline settings (for existing databases)
flyway.baselineOnMigrate=true
flyway.baselineVersion=0

# Validation settings
flyway.validateOnMigrate=true
flyway.validateMigrationNaming=true

# Output settings
flyway.outputQueryResults=true

# Mixed mode (allow out-of-order migrations in development)
flyway.outOfOrder=false
EOF

    # Download MySQL JDBC driver if not present
    JDBC_DIR="$FLYWAY_DIR/drivers"
    MYSQL_DRIVER="$JDBC_DIR/mysql-connector-j-8.3.0.jar"

    if [ ! -f "$MYSQL_DRIVER" ]; then
        print_step "Downloading MySQL JDBC driver..."
        mkdir -p "$JDBC_DIR"
        curl -L "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.3.0/mysql-connector-j-8.3.0.jar" \
             -o "$MYSQL_DRIVER"
        print_info "MySQL JDBC driver downloaded"
    fi

    print_info "Configuration complete"
}

# Function to create helper script
create_helper_script() {
    print_step "Creating helper script..."

    cat > "flyway.sh" << 'EOFHELPER'
#!/bin/bash

# Flyway CLI Helper Script
# Wrapper for common Flyway operations

FLYWAY_VERSION="10.10.0"
FLYWAY_CMD="./flyway-${FLYWAY_VERSION}/flyway"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ ! -f "$FLYWAY_CMD" ]; then
    print_error "Flyway CLI not found. Run ./flyway-manager.sh first to setup"
    exit 1
fi

check_docker() {
    if ! docker ps | grep -q "course-app-mysql"; then
        print_warning "MySQL container is not running!"
        print_info "Starting Docker Compose services..."
        docker-compose up -d
        sleep 10
    fi
}

case "$1" in
    info)
        check_docker
        print_info "Database connection information:"
        $FLYWAY_CMD info
        ;;

    migrate)
        check_docker
        print_info "Running migrations..."
        $FLYWAY_CMD migrate
        ;;

    validate)
        check_docker
        print_info "Validating migrations..."
        $FLYWAY_CMD validate
        ;;

    clean)
        check_docker
        print_warning "This will DROP ALL OBJECTS in the database schema!"
        read -p "Are you sure? Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            $FLYWAY_CMD clean
            print_info "Database cleaned. Run 'migrate' to reapply migrations."
        else
            print_info "Operation cancelled"
        fi
        ;;

    repair)
        check_docker
        print_info "Repairing schema history table..."
        $FLYWAY_CMD repair
        ;;

    baseline)
        check_docker
        print_info "Baselining existing database..."
        $FLYWAY_CMD baseline
        ;;

    undo)
        check_docker
        print_warning "Undoing last migration (requires Flyway Teams)..."
        $FLYWAY_CMD undo
        ;;

    history)
        check_docker
        print_info "Migration history:"
        docker exec course-app-mysql mysql -u admin -pwelcome123 coursedb \
            -e "SELECT installed_rank, version, description, type, installed_on, execution_time, success FROM flyway_schema_history ORDER BY installed_rank;"
        ;;

    create)
        read -p "Enter migration description (use underscores): " description
        if [ -z "$description" ]; then
            print_error "Description cannot be empty"
            exit 1
        fi

        MIGRATION_DIR="api/src/main/resources/db/migration"
        LAST_VERSION=$(ls -1 $MIGRATION_DIR/V*.sql 2>/dev/null | sed 's/.*V\([0-9]*\)__.*/\1/' | sort -n | tail -1)

        if [ -z "$LAST_VERSION" ]; then
            NEXT_VERSION=1
        else
            NEXT_VERSION=$((LAST_VERSION + 1))
        fi

        FILENAME="$MIGRATION_DIR/V${NEXT_VERSION}__${description}.sql"

        cat > "$FILENAME" << EOFMIGRATION
-- Migration: $description
-- Version: V$NEXT_VERSION
-- Date: $(date +%Y-%m-%d)
-- Author: $(git config user.name 2>/dev/null || echo "Unknown")

-- Add your SQL migration here

EOFMIGRATION

        print_info "Migration file created: $FILENAME"
        print_info "Edit the file and run './flyway.sh migrate'"
        ;;

    help|"")
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║          Course App - Flyway CLI Helper                   ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Usage: ./flyway.sh <command>"
        echo ""
        echo "Commands:"
        echo "  info      - Show migration status and pending migrations"
        echo "  migrate   - Execute pending migrations"
        echo "  validate  - Validate applied migrations against available ones"
        echo "  clean     - Drop all objects in schema (⚠️  DEV ONLY!)"
        echo "  repair    - Repair schema history table"
        echo "  baseline  - Baseline existing database at current version"
        echo "  history   - Show detailed migration history from database"
        echo "  create    - Create a new migration file"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./flyway.sh info        # Check current status"
        echo "  ./flyway.sh migrate     # Apply pending migrations"
        echo "  ./flyway.sh create      # Create new migration"
        echo "  ./flyway.sh clean       # Reset database (dev only)"
        echo ""
        ;;

    *)
        print_error "Unknown command: $1"
        echo "Run './flyway.sh help' for usage information"
        exit 1
        ;;
esac
EOFHELPER

    chmod +x flyway.sh
    print_info "Helper script created: ./flyway.sh"
}

# Function to show usage information
show_usage() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Flyway CLI Setup Complete! ✓                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_info "Flyway CLI ${FLYWAY_VERSION} installed in: $FLYWAY_DIR"
    echo ""
    echo "Quick Start:"
    echo "  1. Start MySQL:       docker-compose up -d"
    echo "  2. Check status:      ./flyway.sh info"
    echo "  3. Run migrations:    ./flyway.sh migrate"
    echo ""
    echo "Common Commands:"
    echo "  ./flyway.sh help       Show all commands"
    echo "  ./flyway.sh info       Migration status"
    echo "  ./flyway.sh migrate    Apply migrations"
    echo "  ./flyway.sh validate   Verify migrations"
    echo "  ./flyway.sh create     Create new migration"
    echo "  ./flyway.sh clean      Reset database (⚠️  dev only)"
    echo ""
    echo "Direct Flyway CLI:"
    echo "  $FLYWAY_DIR/flyway <command>"
    echo ""
    echo "Configuration:"
    echo "  Edit: $FLYWAY_DIR/conf/flyway.conf"
    echo ""
    echo "Documentation:"
    echo "  https://flywaydb.org/documentation/"
    echo ""
}

# Main installation process
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Flyway CLI Setup for course-app                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    check_existing
    download_flyway
    extract_flyway
    configure_flyway
    create_helper_script
    show_usage

    print_info "Setup complete! Run './flyway.sh help' to get started"
}

# Run main installation
main
