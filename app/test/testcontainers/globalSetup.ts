// DEMO: a throwaway Postgres per test run, created by the test run itself.
// Same integration tests, no docker compose — Testcontainers starts and removes
// the containers. Run with: npm run test:integration:tc
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Network, Wait } from 'testcontainers';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

// Testcontainers ignores `docker context`. With OrbStack, Colima or rootless
// Docker the socket is not at /var/run/docker.sock — ask the docker CLI instead.
function useActiveDockerContext(): void {
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

export default async function setup(project: TestProject) {
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
  const liquibaseImage = await GenericContainer.fromDockerfile(path.join(project.config.root, 'db')).build(
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

  // Global setup runs in the main process; test files run in workers.
  // provide() hands the value over — test/integration/env.ts inject()s it.
  project.provide('databaseUrl', postgres.getConnectionUri());

  // Returning a function = teardown. No globals needed to share the containers.
  return async () => {
    await postgres.stop();
    await network.stop();
  };
}
