import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { EnvValidationError, loadEnv } from './env.js';

/** O `.env.example` da raiz do monorepo, como o dev o copia para `.env`. */
const envExample = parseEnv(
  readFileSync(new URL('../../../../../.env.example', import.meta.url), 'utf8'),
);

describe('loadEnv', () => {
  it('aceita o .env.example da raiz', () => {
    const env = loadEnv(envExample);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
  });

  it('recusa variável obrigatória ausente, nomeando-a', () => {
    const { BETTER_AUTH_SECRET: _omitted, ...sem } = envExample;
    expect(() => loadEnv(sem)).toThrow(EnvValidationError);
    expect(() => loadEnv(sem)).toThrow(/BETTER_AUTH_SECRET \(ausente\)/);
  });

  it('nomeia todas as variáveis com problema de uma vez', () => {
    const { DATABASE_URL: _a, REDIS_URL: _b, ...sem } = envExample;
    let error: unknown;
    try {
      loadEnv(sem);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvValidationError);
    expect((error as EnvValidationError).variables).toEqual([
      'DATABASE_URL (ausente)',
      'REDIS_URL (ausente)',
    ]);
  });

  it('recusa valor inválido sem imprimir o valor de nenhuma variável', () => {
    const secreto = 'valor-que-nao-pode-vazar-no-log';
    const invalido = {
      ...envExample,
      BETTER_AUTH_SECRET: secreto,
      REDIS_URL: 'nao-e-url',
    };
    let message = '';
    try {
      loadEnv(invalido);
    } catch (caught) {
      message = (caught as Error).message;
    }
    expect(message).toMatch(/REDIS_URL \(inválida/);
    expect(message).not.toContain('nao-e-url');
    expect(message).not.toContain(secreto);
    // Valor vazio (TRUSTED_PROXIES=) não é dado que possa vazar.
    for (const value of Object.values(envExample).filter((v) => v !== '')) {
      expect(message).not.toContain(value);
    }
  });

  it('trata valor vazio de variável opcional como ausente', () => {
    const env = loadEnv({ ...envExample, COOKIE_DOMAIN: '', LOG_LEVEL: '' });
    expect(env.COOKIE_DOMAIN).toBeUndefined();
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('deixa TRUSTED_PROXIES indefinida quando vazia ou ausente, como no .env.example', () => {
    expect(envExample.TRUSTED_PROXIES).toBe('');
    expect(loadEnv(envExample).TRUSTED_PROXIES).toBeUndefined();
    const { TRUSTED_PROXIES: _omitted, ...sem } = envExample;
    expect(loadEnv(sem).TRUSTED_PROXIES).toBeUndefined();
  });

  it('lê TRUSTED_PROXIES como lista de IPs e faixas CIDR separados por vírgula', () => {
    const env = loadEnv({
      ...envExample,
      TRUSTED_PROXIES: '10.0.0.0/8, 172.16.0.1 ,fd00::/8,',
    });
    expect(env.TRUSTED_PROXIES).toEqual([
      '10.0.0.0/8',
      '172.16.0.1',
      'fd00::/8',
    ]);
  });

  it('recusa TRUSTED_PROXIES com entrada que não é IP nem CIDR, sem ecoar o valor', () => {
    let message = '';
    try {
      loadEnv({ ...envExample, TRUSTED_PROXIES: '10.0.0.0/8,proxy-interno' });
    } catch (caught) {
      message = (caught as Error).message;
    }
    expect(message).toMatch(/TRUSTED_PROXIES \(inválida/);
    expect(message).not.toContain('proxy-interno');
  });

  it('exige TRUSTED_PROXIES com NODE_ENV=production, vazia ou ausente, sem ecoar valor', () => {
    const production: Record<string, string | undefined> = {
      ...envExample,
      NODE_ENV: 'production',
    };
    const { TRUSTED_PROXIES: _omitted, ...sem } = production;
    for (const source of [production, sem]) {
      let error: unknown;
      try {
        loadEnv(source);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).variables).toEqual([
        'TRUSTED_PROXIES (ausente)',
      ]);
      for (const value of Object.values(envExample).filter((v) => v !== '')) {
        expect((error as Error).message).not.toContain(value);
      }
    }
    expect(
      loadEnv({ ...production, TRUSTED_PROXIES: '10.0.0.0/8' }).TRUSTED_PROXIES,
    ).toEqual(['10.0.0.0/8']);
  });

  it('lê ADMIN_EMAIL como opcional', () => {
    expect(loadEnv(envExample).ADMIN_EMAIL).toBe(envExample.ADMIN_EMAIL);
    const { ADMIN_EMAIL: _omitted, ...sem } = envExample;
    expect(loadEnv(sem).ADMIN_EMAIL).toBeUndefined();
    expect(loadEnv({ ...envExample, ADMIN_EMAIL: '' }).ADMIN_EMAIL).toBe(
      undefined,
    );
  });

  it('recusa NODE_ENV fora de development, test e production', () => {
    expect(() => loadEnv({ ...envExample, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV \(inválida/,
    );
  });

  it('usa a porta 3000 quando PORT falta ou vem vazia', () => {
    const { PORT: _omitted, ...sem } = envExample;
    expect(loadEnv(sem).PORT).toBe(3000);
    expect(loadEnv({ ...envExample, PORT: '' }).PORT).toBe(3000);
    expect(loadEnv({ ...envExample, PORT: '8080' }).PORT).toBe(8080);
  });

  it('recusa PORT fora de 1 a 65535, nomeando a variável (CLI-CONFIG-03)', () => {
    for (const port of ['70000', '0', 'abc']) {
      expect(() => loadEnv({ ...envExample, PORT: port })).toThrow(
        /PORT \(inválida/,
      );
    }
  });
});
