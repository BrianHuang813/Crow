import { describe, it, expect } from 'vitest';
import { PLUGIN_REPO, PLUGIN_INSTALL_STEPS, PLUGIN_RUN_COMMAND } from '../submit';

describe('submit constants', () => {
  it('exposes the plugin repo, install steps, and run command', () => {
    expect(PLUGIN_REPO).toBe('https://github.com/BrianHuang813/crow-plugins');
    expect(PLUGIN_INSTALL_STEPS).toEqual([
      '/plugin marketplace add BrianHuang813/crow-plugins',
      '/plugin install crow-submit@crow',
    ]);
    expect(PLUGIN_RUN_COMMAND).toBe('/crow-submit:submit');
  });
});
