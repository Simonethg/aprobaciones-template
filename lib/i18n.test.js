import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DICT, detectLocale, dictKeys, t, translateError } from './i18n.js';

test('every key exists in English and Spanish', () => {
  assert.deepEqual(dictKeys('en'), dictKeys('es'));
  for (const key of dictKeys('en')) {
    assert.equal(typeof DICT.es[key], 'string');
    assert.equal(typeof DICT.en[key], 'string');
    assert.ok(DICT.es[key].length > 0, key);
    assert.ok(DICT.en[key].length > 0, key);
  }
  assert.equal(t('es', 'section.aprobaciones'), 'Aprobaciones');
  assert.equal(t('en', 'section.aprobaciones'), 'Approvals');
  assert.equal(t('es', 'section.tareas'), 'Tareas mías');
  assert.equal(t('en', 'section.tareas'), 'My tasks');
  assert.equal(t('es', 'section.metas'), 'Metas');
  assert.equal(t('en', 'section.metas'), 'Goals');
  assert.equal(t('es', 'skip.content'), 'Saltar al contenido');
  assert.equal(t('en', 'skip.content'), 'Skip to content');
  assert.equal(t('en', 'pending.aria', { n: 4 }), '4 pending');
});

test('the default language follows the browser and falls back to English', () => {
  assert.equal(detectLocale(undefined, null), 'en');
  assert.equal(detectLocale('fr-FR', ''), 'en');
  assert.equal(detectLocale('en-US', null), 'en');
  assert.equal(detectLocale('ES', undefined), 'es');
  assert.equal(detectLocale('es-AR', null), 'es');
  assert.equal(t('fr', 'section.metas'), 'Goals');
  assert.equal(detectLocale('es-AR', 'en'), 'en');
  assert.equal(detectLocale('en-GB', 'es'), 'es');
});

test('switching language changes the strings and the known errors', () => {
  assert.notEqual(t('es', 'item.approve'), t('en', 'item.approve'));
  assert.equal(translateError('en', 'Not authorized'), 'Not authorized');
  assert.equal(translateError('es', 'Not authorized'), 'No autorizado');
  assert.equal(translateError('es', 'Wrong code'), 'Código incorrecto');
  assert.match(translateError('es', 'Invalid status. Use: pendiente'), /status inválido/);
  const ui = readFileSync(new URL('../app/I18n.js', import.meta.url), 'utf8');
  assert.match(ui, /aprob\.lang/);
  assert.match(ui, /documentElement\.lang/);
  assert.match(ui, /aria-pressed/);
  assert.match(ui, /data-testid="lang-es"/);
  assert.match(ui, /data-testid="lang-en"/);
});
