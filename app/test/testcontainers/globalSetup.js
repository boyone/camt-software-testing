// DEMO: a throwaway Postgres per test run, created by the test run itself.
// Same integration tests, no docker compose — Testcontainers starts and removes
// the containers. Run with: npm run test:integration:tc
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer, Network, Wait } = require('testcontainers');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

// Testcontainers ignores `docker context`. With OrbStack, Colima or rootless
// Docker the socket is not at /var/run/docker.sock — ask the docker CLI instead.
function useActiveDockerContext() {
  if (process.env.DOCKER_HOST) return;
  try {
    const host = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], {
      encoding: 'utf8',
    }).trim();
    if (host) process.env.DOCKER_HOST = host;
  } catch {
    // keep Testcontainers' own discovery
  }
}

module.exports = async function globalSetup() {
  useActiveDockerContext();
  const network = await new Network().start();

  const postgres = await new PostgreSqlContainer('postgres:17-alpine')
    .withNetwork(network)
    .withNetworkAliases('db')
    .withDatabase('election_test')
    .withUsername('election')
    .withPassword('election')
    .start();

  // Build our Liquibase image (changelog baked in) and run `update` once.
  const liquibaseImage = await GenericContainer.fromDockerfile(path.join(__dirname, '../../db')).build(
    'election-liquibase-tc',
    { deleteOnExit: false },
  );
  await liquibaseImage
    .withNetwork(network)
    .withEnvironment({
      LIQUIBASE_COMMAND_URL: 'jdbc:postgresql://db:5432/election_test',
      LIQUIBASE_COMMAND_USERNAME: 'election',
      LIQUIBASE_COMMAND_PASSWORD: 'election',
      LIQUIBASE_COMMAND_CHANGELOG_FILE: 'db.changelog-master.yaml',
      LIQUIBASE_COMMAND_CONTEXTS: 'test',
    })
    .withCommand(['update'])
    .withWaitStrategy(Wait.forOneShotStartup())
    .start();

  // Test files read DATABASE_URL (test/integration/env.ts keeps it if already set).
  process.env.DATABASE_URL = postgres.getConnectionUri();
  globalThis.__TC__ = { postgres, network };
};
