import * as BalenaSettingsClientModule from 'balena-settings-client';
import * as FsModule from 'fs';
import * as m from 'mochainon';
import * as path from 'path';
import { BalenaSettingsPermissionError } from 'balena-errors';

import { createStorage } from '../lib/local-storage';
import getStorage = require('../lib/storage');

const IS_BROWSER = typeof window !== 'undefined';

let dataDirectory: string | undefined;
let fs: typeof FsModule;
if (!IS_BROWSER) {
	// tslint:disable no-var-requires
	fs = require('fs');
	const settings: typeof BalenaSettingsClientModule = require('balena-settings-client');
	dataDirectory = settings.get<string>('dataDirectory');
}

const localStorage = createStorage(dataDirectory);
const storage = getStorage({ dataDirectory });

// tslint:disable no-unused-expression

describe('Storage:', () => {
	beforeEach(() => storage.clear());

	after(() => storage.clear());

	describe('given numbers', () => {
		it('should be able to save a float number', () =>
			storage.set('pi', 3.14).then(() => {
				return m.chai.expect(storage.get('pi')).to.eventually.equal(3.14);
			}));

		it('should be able to save an integer number', () =>
			storage.set('age', 34).then(() => {
				return m.chai.expect(storage.get('age')).to.eventually.equal(34);
			}));

		it('should be able to save a string number containin numbers as a string', () =>
			storage.set('pi', 'pi=3.14').then(() => {
				return m.chai.expect(storage.get('pi')).to.eventually.equal('pi=3.14');
			}));
	});

	describe('given objects', () => {
		it('should be able to save a plain object', () =>
			storage.set('pi', { value: 3.14 }).then(() => {
				return m.chai
					.expect(storage.get('pi'))
					.to.eventually.deep.equal({ value: 3.14 });
			}));

		it('should be able to save an empty object', () =>
			storage.set('empty', {}).then(() => {
				return m.chai.expect(storage.get('empty')).to.eventually.deep.equal({});
			}));
	});

	describe('.set()', () => {
		describe('given a key does not exist', () => {
			it('should be able to set a value', () => {
				return m.chai
					.expect(storage.get('foobar'))
					.to.eventually.equal(undefined)
					.then(() => storage.set('foobar', 'Hello'))
					.then(() => {
						return m.chai
							.expect(storage.get('foobar'))
							.to.eventually.equal('Hello');
					});
			});
		});

		describe('given a key already exist', () => {
			beforeEach(() => storage.set('foobar', 'Hello'));

			afterEach(() => storage.remove('foobar'));

			it('should be able to change the value', () => {
				return m.chai
					.expect(storage.get('foobar'))
					.to.eventually.equal('Hello')
					.then(() => storage.set('foobar', 'World'))
					.then(() =>
						m.chai.expect(storage.get('foobar')).to.eventually.equal('World'),
					);
			});
		});
	});

	describe('.get()', () => {
		describe('given a key does not exist', () => {
			it('should eventually be undefined', () =>
				m.chai.expect(storage.get('foobar')).to.eventually.equal(undefined));
		});

		describe('given a key already exist', () => {
			beforeEach(() => storage.set('foobar', 'Hello'));

			it('should eventually be the value', () =>
				m.chai.expect(storage.get('foobar')).to.eventually.equal('Hello'));
		});

		describe('given getItem throws an error', () => {
			let getItemStub: any;
			beforeEach(() => {
				getItemStub = m.sinon.stub(localStorage, 'getItem');
				getItemStub.throws(new Error('ENOENT'));
			});

			afterEach(() => {
				getItemStub.restore();
			});

			it('should eventually be undefined', () =>
				m.chai.expect(storage.get('foobar')).to.eventually.equal(undefined));
		});

		describe('given an externally saved value', () => {
			// this test is node-specific
			if (IS_BROWSER) {
				return;
			}

			describe('with expected file access', () => {
				let fooPath: string;
				beforeEach(() => {
					fooPath = path.join(dataDirectory!, 'foo');
					fs.writeFileSync(fooPath, 'hello world');
				});

				afterEach(() => {
					fs.unlinkSync(fooPath);
				});

				it('should be able to read back', () =>
					m.chai.expect(storage.get('foo')).to.eventually.equal('hello world'));
			});

			describe('with no read access', () => {
				let fsReadFileStub: any;
				beforeEach(() => {
					fsReadFileStub = m.sinon.stub(fs.promises, 'readFile');
					fsReadFileStub.rejects({ code: 'EACCES' });
				});

				afterEach(() => {
					fsReadFileStub.restore();
				});

				it('should raise an error', () => {
					return m.chai
						.expect(storage.get('bar'))
						.to.eventually.be.rejectedWith(BalenaSettingsPermissionError);
				});
			});
		});
	});

	describe('.has()', () => {
		describe('given a key does not exist', () => {
			it('should eventually be false', () =>
				m.chai.expect(storage.has('foobar')).to.eventually.equal(false));
		});

		describe('given a key already exist', () => {
			beforeEach(() => storage.set('foobar', 'Hello'));

			it('should eventually be true', () =>
				m.chai.expect(storage.has('foobar')).to.eventually.equal(true));
		});
	});

	describe('.remove()', () => {
		describe('given a key does not exist', () => {
			it('should do nothing', () => {
				m.chai.expect(storage.has('foobar')).to.eventually.equal(false);
				return storage
					.remove('foobar')
					.then(() =>
						m.chai.expect(storage.has('foobar')).to.eventually.equal(false),
					);
			});
		});

		describe('given a key already exist', () => {
			beforeEach(() => storage.set('foobar', 'Hello'));

			it('should remove the key', () => {
				return m.chai
					.expect(storage.has('foobar'))
					.to.eventually.equal(true)
					.then(() => storage.remove('foobar'))
					.then(() =>
						m.chai.expect(storage.has('foobar')).to.eventually.equal(false),
					);
			});
		});
	});
});
