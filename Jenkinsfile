
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

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube-Local') {
                    withCredentials([
                        string(credentialsId: 'sonarqube-token',
                               variable: 'SONAR_TOKEN')
                    ]) {
                        bat 'C:\\SonarScanner\\bin\\sonar-scanner.bat -Dsonar.host.url=http://localhost:9000 -Dsonar.token=%SONAR_TOKEN%'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                bat '"C:\\Users\\param\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe" build -t assistnav:1.1 .'
            }
        }
    }

    post {
        success {
            echo 'AssistNav validation, SonarQube analysis, and Docker build succeeded.'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}
