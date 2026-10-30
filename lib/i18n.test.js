import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DICT, detectLocale, dictKeys, t, translateError } from './i18n.js';

test('todas las claves existen en español y en inglés', () => {
  assert.deepEqual(dictKeys('es'), dictKeys('en'));
  for (const key of dictKeys('es')) {
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

test('el idioma por defecto sigue al navegador y cae en español', () => {
  assert.equal(detectLocale(undefined, null), 'es');
  assert.equal(detectLocale('fr-FR', ''), 'es');
  assert.equal(detectLocale('en-US', null), 'en');
  assert.equal(detectLocale('EN', undefined), 'en');
  assert.equal(detectLocale('es-AR', 'en'), 'en');
  assert.equal(detectLocale('en-GB', 'es'), 'es');
});

test('cambiar de idioma cambia los textos y los errores conocidos', () => {
  assert.notEqual(t('es', 'item.approve'), t('en', 'item.approve'));
  assert.equal(translateError('es', 'No autorizado'), 'No autorizado');
  assert.equal(translateError('en', 'No autorizado'), 'Not authorized');
  assert.equal(translateError('en', 'Código incorrecto'), 'Wrong code');
  assert.match(translateError('en', 'status inválido. Usá: pendiente'), /Invalid status/);
  const ui = readFileSync(new URL('../app/I18n.js', import.meta.url), 'utf8');
  assert.match(ui, /aprob\.lang/);
  assert.match(ui, /documentElement\.lang/);
  assert.match(ui, /aria-pressed/);
  assert.match(ui, /data-testid="lang-es"/);
  assert.match(ui, /data-testid="lang-en"/);
});
