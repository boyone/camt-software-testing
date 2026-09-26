// Jenkins version (declarative pipeline).
// Same npm scripts as local, GitHub Actions and GitLab CI.
//
// Agent requirements:
//   - a Linux agent labelled "docker" with Docker Engine + the compose plugin,
//     and the jenkins user allowed to use Docker (member of the "docker" group)
//   - NodeJS plugin, with a Node 24 installation named "node-24"
//     (Manage Jenkins → Tools → NodeJS installations)
//
// Compose runs on the agent's own Docker daemon, so published ports
// (5433 Postgres, 3000 app) are reached at localhost — no overrides needed.

pipeline {
  agent { label 'docker' }

  tools { nodejs 'node-24' }

  options {
    timeout(time: 30, unit: 'MINUTES')
    // Compose publishes fixed host ports, so two builds cannot share an agent.
    disableConcurrentBuilds()
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Install') {
      steps {
        dir('app') {
          sh 'npm ci'
        }
      }
    }

    stage('Unit') {
      steps {
        dir('app') {
          sh 'npm run typecheck'
          sh 'npm run test:coverage'
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'app/coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('Integration') {
      steps {
        dir('app') {
          sh 'npm run db:test-rollback'
          sh 'npm run test:integration'
        }
      }
    }

    stage('E2E') {
      steps {
        dir('app') {
          sh 'npm run test:e2e'
        }
      }
    }
  }

  post {
    failure {
      dir('app') {
        sh 'docker compose --profile e2e logs app || true'
        archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
      }
    }
    always {
      // Agents are long-lived: remove containers and volumes after every build.
      dir('app') {
        sh 'docker compose --profile e2e --profile tools down -v --remove-orphans || true'
      }
    }
  }
}
