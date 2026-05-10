import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../lib/logger';

describe('createLogger', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('error() forwards to console.error with tag prefix', () => {
    const log = createLogger('matchStore');
    log.error('kickoff failed', { matchId: 'abc' });
    expect(errSpy).toHaveBeenCalledTimes(1);
    const [prefix, msg, ctx] = errSpy.mock.calls[0]!;
    expect(prefix).toBe('[matchStore]');
    expect(msg).toBe('kickoff failed');
    expect(ctx).toEqual({ matchId: 'abc' });
  });

  it('warn() forwards to console.warn with tag prefix', () => {
    const log = createLogger('feed');
    log.warn('rate limit approaching');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toBe('[feed]');
  });

  it('info() is only emitted in dev mode', () => {
    const log = createLogger('dev-only');
    log.info('hello');
    // Tests run with DEV=true under Vitest, so this should show.
    expect(infoSpy).toHaveBeenCalled();
  });

  it('child() composes tag paths', () => {
    const root = createLogger('root');
    const child = root.child('sub');
    child.error('boom');
    expect(errSpy.mock.calls[0]![0]).toBe('[root:sub]');
  });

  it('error() accepts Error objects', () => {
    const log = createLogger('tag');
    const err = new Error('network down');
    log.error(err);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![1]).toBe(err);
  });
});
