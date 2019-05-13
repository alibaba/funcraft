'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const Docker = require('dockerode');
const inquirer = require('inquirer');
const EventEmitter = require('events');
const Container = require('../../lib/edge/container');

const TEST_CONTAINER_ID = 'd852359721fe';
const TEST_COPY_SOURCE_TAR = '/tmp/source/test.tar';
const TEST_COPY_TARGET_DIR = '/tmp/target/';

describe('edge/Container', function () {
  describe('#isCreated', function () {
    let listContainers;
    let docker;
    beforeEach(function () {
      docker = new Docker();
      listContainers = sinon.stub(docker, 'listContainers');
    });
    afterEach(function () {
      listContainers.restore();
      docker = undefined;
    });
    it('should return false since cannot find a existing container', async function () {
      listContainers.resolves([]);
      const container = Container.edge(docker);
      await container.bind();
      expect(container.isCreated()).to.not.be.ok();
    });
    it('should return true since find a existing container', async function () {
      listContainers.resolves([{
        Id: TEST_CONTAINER_ID
      }]);
      const container = Container.edge(docker);
      await container.bind();
      expect(container.isCreated()).to.be.ok();
    });
  });
  describe('#isRunning', function () {
    let listContainers;
    let docker;
    beforeEach(function () {
      docker = new Docker();
      listContainers = sinon.stub(docker, 'listContainers');
    });
    afterEach(function () {
      listContainers.restore();
      docker = undefined;
    });
    it('should return false since the container is not running', async function () {
      listContainers.resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'exited'
      }]);
      const container = Container.edge(docker);
      await container.bind();
      expect(container.isRunning()).to.not.be.ok();
    });
    it('should return true since the container is running', async function () {
      listContainers.resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'running'
      }]);
      const container = Container.edge(docker);
      await container.bind();
      expect(container.isRunning()).to.be.ok();
    });
  });
  describe('#hasImage', function () {
    let listImages;
    let docker;
    beforeEach(function () {
      docker = new Docker();
      listImages = sinon.stub(docker, 'listImages');
    });
    afterEach(function () {
      listImages.restore();
      docker = undefined;
    });
    it('should return false since cannot find a image locally', async function () {
      listImages.resolves([]);
      const container = Container.edge(docker);
      expect(await container.hasImage()).to.not.be.ok();
    });
    it('should return true since find a image locally', async function () {
      listImages.resolves([{
        Id: '4f0cf2cf1be12',
        ParentId: ''
      }]);
      const container = Container.edge(docker);
      expect(await container.hasImage()).to.be.ok();
    });
  });
  describe('#pullImage', function () {
    let listImages;
    let docker;
    beforeEach(function () {
      docker = new Docker();
      listImages = sinon.stub(docker, 'pull');
    });
    afterEach(function () {
      listImages.restore();
      docker = undefined;
    });
    it('should fail since connection error', async function () {
      listImages.rejects(new Error('Cannot connect to the registry'));
      let error;
      try {
        const container = Container.edge(docker);
        await container.pullImage();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
    });
    it('should fail since download error', async function () {
      listImages.resolves(process.stdin);
      const follow = sinon.stub(docker.modem, 'followProgress')
        .callsFake(function (stream, onFinished, onProgress) {
          onFinished(new Error('Cannot read data from ' + stream));
        });
      let error;
      try {
        const container = Container.edge(docker);
        await container.pullImage();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      follow.restore();
    });
    it('should pass since all requirements meet', async function () {
      listImages.resolves(process.stdin);
      const follow = sinon.stub(docker.modem, 'followProgress')
        .callsFake(function (stream, onFinished, onProgress) {
          onFinished(null);
        });
      const container = Container.edge(docker);
      expect(await container.pullImage()).to.be.ok();
      follow.restore();
    });
  });
  describe('#create', function () {
    let key = 'Your Product Key';
    let name = 'Your Device Name';
    let secret = 'Your Device Secret';
    let run;
    let docker;
    beforeEach(function () {
      docker = new Docker();
      run = sinon.stub(docker, 'run');
    });
    afterEach(function () {
      run.restore();
      docker = undefined;
    });
    it('should fail since the container already exists', async function () {
      const listContainers = sinon.stub(docker, 'listContainers');
      listContainers.resolves([{
        Id: TEST_CONTAINER_ID
      }]);
      let error;
      try {
        const container = Container.edge(docker);
        await container.bind();
        await container.create();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      listContainers.restore();
    });
    it('should fail since read secret triples error', async function () {
      const prompt = sinon.stub(inquirer, 'prompt').rejects(new Error('Cannot read secret triples'));
      let error;
      try {
        const container = Container.edge(docker);
        await container.create();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      prompt.restore();
    });
    it('should fail since applying secret triples error', async function () {
      run.rejects(new Error(`Cannot apply secret triples`));
      const prompt = sinon.stub(inquirer, 'prompt').resolves({ key, name, secret });
      let error;
      try {
        const container = Container.edge(docker);
        await container.create();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      prompt.restore();
    });
    it('should fail since create container error', async function () {
      run.resolves();
      const prompt = sinon.stub(inquirer, 'prompt').resolves({ key, name, secret });
      const createContainer = sinon.stub(docker, 'createContainer')
        .rejects(new Error('Cannot create the container'));
      let error;
      try {
        const container = Container.edge(docker);
        await container.create();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      createContainer.restore();
      prompt.restore();
    });
    it('should pass since all requirements meet', async function () {
      run.resolves();
      const prompt = sinon.stub(inquirer, 'prompt').resolves({ key, name, secret });
      const createContainer = sinon.stub(docker, 'createContainer').resolves({
        id: TEST_CONTAINER_ID
      });
      function restore() {
        createContainer.restore();
        prompt.restore();
      }
      const container = Container.edge(docker);
      const id = await container.create();
      expect(id).to.be(TEST_CONTAINER_ID);
      restore();
    });
  });
  describe('#start', function () {
    let docker;
    let container;
    let hasImage;
    let pullImage;
    beforeEach(function () {
      docker = Docker();
      container = Container.edge(docker);
      hasImage = sinon.stub(container, 'hasImage').resolves(true);
      pullImage = sinon.stub(container, 'pullImage').resolves();
    });
    afterEach(function () {
      hasImage.restore();
      pullImage.restore();
      docker = undefined;
      container = undefined;
    });
    it('should skip creating a container since a local one was created', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'running'
      }]);
      const create = sinon.stub(container, 'create').callsFake(function () {
        return Promise.resolve(TEST_CONTAINER_ID);
      });
      await container.start();
      expect(create.calledOnce).to.not.be.ok;
      create.restore();
      listContainers.restore();
    });
    it('should create a container since no local one found', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([]);
      const create = sinon.stub(container, 'create').callsFake(function () {
        return Promise.resolve(TEST_CONTAINER_ID);
      });
      const getContainer = sinon.stub(docker, 'getContainer').returns({
        start: async function () {}
      });
      await container.start();
      expect(create.calledOnce).to.be.ok;
      getContainer.restore();
      create.restore();
      listContainers.restore();
    });
    it('should skip starting the container since it is running', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'running'
      }]);
      const spy = sinon.spy();
      const getContainer = sinon.stub(docker, 'getContainer').returns({
        start: async function () {
          spy();
        }
      });
      await container.start();
      expect(spy.calledOnce).to.not.be.ok;
      getContainer.restore();
      listContainers.restore();
    });
    it('should start the container since it is not running', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID
      }]);
      const spy = sinon.spy();
      const getContainer = sinon.stub(docker, 'getContainer').returns({
        start: async function () {
          spy();
        }
      });
      await container.start();
      expect(spy.calledOnce).to.be.ok;
      getContainer.restore();
      listContainers.restore();
    });
  });
  describe('#stop', function () {
    let docker;
    beforeEach(function () {
      docker = Docker();
    });
    afterEach(function () {
      docker = undefined;
    });
    it('should skip stopping since the local container is not created', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([]);
      const getContainer = sinon.stub(docker, 'getContainer').returns({});
      const container = Container.edge(docker);
      await container.stop();
      expect(getContainer.calledOnce).to.not.be.ok;
      getContainer.restore();
      listContainers.restore();
    });
    it('should skip stopping since the local container is not running', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'exited'
      }]);
      const getContainer = sinon.stub(docker, 'getContainer').returns({});
      const container = Container.edge(docker);
      await container.stop();
      expect(getContainer.calledOnce).to.not.be.ok;
      getContainer.restore();
      listContainers.restore();
    });
    it('should stop the container since it is running', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'running'
      }]);
      const spy = sinon.spy();
      const getContainer = sinon.stub(docker, 'getContainer').returns({
        stop: async function () {
          spy();
        }
      });
      const container = Container.edge(docker);
      await container.stop();
      expect(spy.calledOnce).to.be.ok;
      getContainer.restore();
      listContainers.restore();
    });
  });
  describe('#copy', function () {
    let docker;
    beforeEach(function () {
      docker = Docker();
    });
    afterEach(function () {
      docker = undefined;
    });
    it('should throw since the local container is not created', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([]);
      const container = Container.edge(docker);
      let error;
      try {
        await container.copy(TEST_COPY_SOURCE_TAR, TEST_COPY_TARGET_DIR);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      listContainers.restore();
    });
    it('should throw since the local container is not running', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'exited'
      }]);
      const container = Container.edge(docker);
      let error;
      try {
        await container.copy(TEST_COPY_SOURCE_TAR, TEST_COPY_TARGET_DIR);
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an(Error);
      listContainers.restore();
    });
    it('should pass since all requirements meet', async function () {
      const listContainers = sinon.stub(docker, 'listContainers').resolves([{
        Id: TEST_CONTAINER_ID,
        State: 'running'
      }]);
      const getContainer = sinon.stub(docker, 'getContainer').returns({
        exec: async function () {
          return {
            start: function (opts, callback) {
              class Stream extends EventEmitter {
                end() {
                  this.emit('end');
                }
              }
              const stream = new Stream();
              setTimeout(() => stream.end(), 0);
              callback(null, stream);
            }
          };
        },
        putArchive: async function () {
          return true;
        }
      });
      const container = Container.edge(docker);
      let error;
      try {
        await container.copy(TEST_COPY_SOURCE_TAR, TEST_COPY_TARGET_DIR);
      } catch (err) {
        error = err;
      }
      expect(error).to.not.be.an(Error);
      getContainer.restore();
      listContainers.restore();
    });
  });
});