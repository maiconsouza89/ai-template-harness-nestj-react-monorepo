import {
  isDiagnosticsEnabled,
  readDiagnosticsEnv,
} from './diagnostics.module.js';

const enabled = (source: Record<string, string | undefined>) =>
  isDiagnosticsEnabled(readDiagnosticsEnv(source));

describe('isDiagnosticsEnabled', () => {
  it('liga só com DIAGNOSTICS_ENABLED=true fora de produção', () => {
    expect(
      enabled({ NODE_ENV: 'development', DIAGNOSTICS_ENABLED: 'true' }),
    ).toBe(true);
    expect(enabled({ NODE_ENV: 'test', DIAGNOSTICS_ENABLED: 'true' })).toBe(
      true,
    );
  });

  it('fica desligado sem a flag, com a flag falsa ou em produção', () => {
    expect(enabled({ NODE_ENV: 'development' })).toBe(false);
    expect(
      enabled({ NODE_ENV: 'development', DIAGNOSTICS_ENABLED: 'false' }),
    ).toBe(false);
    expect(
      enabled({ NODE_ENV: 'production', DIAGNOSTICS_ENABLED: 'true' }),
    ).toBe(false);
  });

  it('fica desligado com valor inválido, que o main.ts recusa na subida', () => {
    expect(
      enabled({ NODE_ENV: 'development', DIAGNOSTICS_ENABLED: 'yes' }),
    ).toBe(false);
    expect(enabled({ DIAGNOSTICS_ENABLED: 'true' })).toBe(false);
  });
});
