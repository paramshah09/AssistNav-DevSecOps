
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/paramshah09/AssistNav-DevSecOps.git'
            }
        }

        stage('Validate Website Files') {
            steps {
                bat 'if not exist index.html exit /b 1'
                bat 'if not exist style.css exit /b 1'
                bat 'if not exist script.js exit /b 1'
                echo 'Website files are present.'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t assistnav:1.0 .'
            }
        }
    }

    post {
        success {
            echo 'AssistNav validation and Docker build succeeded.'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}
