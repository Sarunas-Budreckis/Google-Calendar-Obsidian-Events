#!/usr/bin/env node
/**
 * Setup validation script for Google Calendar Obsidian Integration
 * Checks if the environment is properly configured
 */

const fs = require('fs');
const path = require('path');

class SetupChecker {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Check if a file exists
     * @param {string} filePath - Path to check
     * @param {string} description - Description of what's being checked
     * @returns {boolean} - True if file exists
     */
    checkFileExists(filePath, description) {
        if (!fs.existsSync(filePath)) {
            this.errors.push(`Missing ${description}: ${filePath}`);
            return false;
        }
        return true;
    }

    /**
     * Check if a directory exists
     * @param {string} dirPath - Directory path to check
     * @param {string} description - Description of what's being checked
     * @returns {boolean} - True if directory exists
     */
    checkDirectoryExists(dirPath, description) {
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
            this.errors.push(`Missing ${description}: ${dirPath}`);
            return false;
        }
        return true;
    }

    /**
     * Check if .env file exists and has required variables
     */
    checkEnvironmentFile() {
        const envPath = path.join(__dirname, '.env');
        
        if (!this.checkFileExists(envPath, '.env file')) {
            this.errors.push('Please create a .env file with your Google OAuth credentials');
            return false;
        }

        // Read and check .env file contents
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const requiredVars = [
                'GOOGLE_CLIENT_ID',
                'GOOGLE_CLIENT_SECRET', 
                'GOOGLE_REDIRECT_URI',
                'CALENDAR_ID'
            ];

            const missingVars = requiredVars.filter(varName => {
                const regex = new RegExp(`^${varName}=.+`, 'm');
                return !regex.test(envContent);
            });

            if (missingVars.length > 0) {
                this.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
                return false;
            }

            console.log('✓ .env file found with required variables');
            return true;
        } catch (error) {
            this.errors.push(`Error reading .env file: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if node_modules exists
     */
    checkNodeModules() {
        const nodeModulesPath = path.join(__dirname, 'node_modules');
        
        if (!this.checkDirectoryExists(nodeModulesPath, 'node_modules directory')) {
            this.errors.push('Please run "npm install" to install dependencies');
            return false;
        }

        // Check for specific required packages
        const requiredPackages = ['googleapis', 'dotenv'];
        const missingPackages = requiredPackages.filter(pkg => {
            const pkgPath = path.join(nodeModulesPath, pkg);
            return !fs.existsSync(pkgPath);
        });

        if (missingPackages.length > 0) {
            this.errors.push(`Missing required packages: ${missingPackages.join(', ')}`);
            return false;
        }

        console.log('✓ Node modules installed');
        return true;
    }

    /**
     * Check if package.json exists
     */
    checkPackageJson() {
        const packageJsonPath = path.join(__dirname, 'package.json');
        
        if (!this.checkFileExists(packageJsonPath, 'package.json file')) {
            this.errors.push('package.json file is missing');
            return false;
        }

        console.log('✓ package.json found');
        return true;
    }

    /**
     * Check if required script files exist
     */
    checkScriptFiles() {
        const requiredFiles = [
            'main.js',
            'googleCalendarAPI.js', 
            'dateUtils.js',
            'cli.js'
        ];

        let allFilesExist = true;
        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (!this.checkFileExists(filePath, `script file ${file}`)) {
                allFilesExist = false;
            }
        });

        if (allFilesExist) {
            console.log('✓ All required script files found');
        }

        return allFilesExist;
    }

    /**
     * Check if Templater template exists
     */
    checkTemplaterTemplate() {
        const templatePath = path.join(__dirname, '..', 'Templates', 'GCalEventsList.md');
        
        if (!this.checkFileExists(templatePath, 'Templater template file')) {
            this.warnings.push('Templater template file not found. Please copy GCalEventsList.md to your Templates folder.');
            return false;
        }

        console.log('✓ Templater template found');
        return true;
    }

    /**
     * Run all checks
     */
    async runChecks() {
        console.log('🔍 Checking Google Calendar Obsidian Integration setup...\n');

        // Core requirements
        this.checkPackageJson();
        this.checkNodeModules();
        this.checkScriptFiles();
        this.checkEnvironmentFile();
        this.checkTemplaterTemplate();

        // Print results
        console.log('\n📋 Setup Check Results:');
        
        if (this.errors.length === 0) {
            console.log('✅ All required components are properly configured!');
            
            if (this.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                this.warnings.forEach(warning => console.log(`   - ${warning}`));
            }
            
            console.log('\n🚀 You can now use the Google Calendar integration with Templater!');
            return true;
        } else {
            console.log('❌ Setup issues found:');
            this.errors.forEach(error => console.log(`   - ${error}`));
            
            if (this.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                this.warnings.forEach(warning => console.log(`   - ${warning}`));
            }
            
            console.log('\n🔧 Please fix the issues above before using the integration.');
            return false;
        }
    }
}

// Run the setup check
if (require.main === module) {
    const checker = new SetupChecker();
    checker.runChecks().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = SetupChecker;
