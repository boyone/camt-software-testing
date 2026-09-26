module.exports = async function globalTeardown() {
  const { postgres, network } = globalThis.__TC__;
  await postgres.stop();
  await network.stop();
};
