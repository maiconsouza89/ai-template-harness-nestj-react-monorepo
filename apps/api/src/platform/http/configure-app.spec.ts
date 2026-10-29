import { configureAppOptionsFromEnv } from './configure-app.js';

describe('configureAppOptionsFromEnv', () => {
  const webOrigin = 'http://localhost:5173';

  it('publica o documento OpenAPI em development e em test', () => {
    expect(
      configureAppOptionsFromEnv({
        NODE_ENV: 'development',
        WEB_ORIGIN: webOrigin,
      }),
    ).toEqual({ webOrigin, openApi: true });
    expect(
      configureAppOptionsFromEnv({ NODE_ENV: 'test', WEB_ORIGIN: webOrigin }),
    ).toEqual({ webOrigin, openApi: true });
  });

  it('não publica o documento OpenAPI em production', () => {
    expect(
      configureAppOptionsFromEnv({
        NODE_ENV: 'production',
        WEB_ORIGIN: webOrigin,
      }),
    ).toEqual({ webOrigin, openApi: false });
  });
});
