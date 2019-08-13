'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();

const fs = {
  existsSync: sandbox.stub(),
  readFileSync: sandbox.stub()
};

const utilsStub = proxyquire('../../lib/import/utils', {
  'fs': fs
});

describe('import utils', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('test getTemplateFile with the content empty', () => {
    fs.existsSync.returns(true);
    fs.readFileSync.returns(null);

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(utilsStub.getTemplateHeader());
  });

  it('test getTemplateFile with the content invalid', () => {
    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify({ foo: 'bar' }));
    try {
      utilsStub.getTemplateFile('foo');
    } catch (error) {
      return;
    }
    expect().fail('expect throw Error.');
  });

  it('test getTemplateFile with the Transform empty', () => {
    const baseContent = utilsStub.getTemplateHeader();
    delete baseContent.Transform;

    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(utilsStub.getTemplateHeader());
  });

  it('test getTemplateFile with the Transform single value and not equal to fun default', () => {
    const baseContent = utilsStub.getTemplateHeader();
    baseContent.Transform = 'foo';

    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(Object.assign(utilsStub.getTemplateHeader(), { Transform: [ 'foo', utilsStub.getTemplateHeader().Transform ] }));
  });

  it('test getTemplateFile with the Transform array value and not contain fun default', () => {
    const baseContent = utilsStub.getTemplateHeader();
    baseContent.Transform = [ 'foo' ];

    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(Object.assign(utilsStub.getTemplateHeader(), { Transform: [ 'foo', utilsStub.getTemplateHeader().Transform ] }));
  });

  it('test getTemplateFile with the Transform array value and contain fun default', () => {
    const baseContent = utilsStub.getTemplateHeader();
    baseContent.Transform = [ 'foo', baseContent.Transform ];

    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(Object.assign(utilsStub.getTemplateHeader(), { Transform: [ 'foo', utilsStub.getTemplateHeader().Transform ] }));
  });

  it('test getTemplateFile with the Resources empty', () => {
    const baseContent = utilsStub.getTemplateHeader();
    delete baseContent.Resources;
    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(utilsStub.getTemplateHeader());
  });

  it('test getTemplateFile with the Resources not empty', () => {
    const baseContent = utilsStub.getTemplateHeader();
    baseContent.Resources.test = {
      foo: 'bar'
    };
    fs.existsSync.returns(true);
    fs.readFileSync.returns(JSON.stringify(baseContent));

    const { content } = utilsStub.getTemplateFile('foo');
    expect(content).to.be.eql(Object.assign(utilsStub.getTemplateHeader(), {
      Resources: {
        test: {
          foo: 'bar'
        }
      }
    }));
  });


});