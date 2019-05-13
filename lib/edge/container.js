'use strict';

const debug = require('debug')('fun:edge:container');
const Docker = require('dockerode');

/**
 * The class represents the local Link IoT Edge container, which provides basic high level
 * interfaces to interact with it.
 */
class Container {

  /**
   * Return the edge container instance.
   *
   * @returns {Container}
   */
  static edge(docker = undefined) {
    return new Container({
      docker,
      name: Container._getName(),
      image: Container._getImage()
    });
  }

  /**
   * Create a new edge container instance.
   *
   * @param image the image of the container.
   * @param name the name of the container.
   * @param docker the docker daemon client.
   */
  constructor({
    image,
    name = undefined,
    docker = new Docker()
  } = {}) {
    this.image = image;
    this.name = name;
    this.docker = docker;
    // Wrapping the promise with a function due to we want it to be lazy to execute.
    this.bind = () => {
      if (!this._p) {
        this._p = this._bind(image, name);
      }
      return this._p;
    };
  }

  /**
   * Start the container. It pulls the image or creates a new container if none existing
   * respectively.
   *
   * @return {Promise.<void>}
   */
  async start() {
    await this.bind();
    if (!this.isCreated()) {
      console.log('No local container found，try to create one...');
      const hasImage = await this.hasImage();
      if (!hasImage) {
        await this.pullImage();
      }
      await this.create();
    }
    if (!this.isRunning()) {
      const container = this.docker.getContainer(this.id);
      await container.start();
      this._running = true;
      console.log(`Container ${this.name} is started.`);
    } else {
      console.log(`Container ${this.name} is running. Skip starting.`);
    }
  }

  /**
   * Stop the container.
   *
   * @return {Promise.<void>}
   */
  async stop() {
    await this.bind();
    if (!this.isCreated()) {
      console.log('Container is not created. Skip stopping.');
      return;
    }
    if (this.isRunning()) {
      const container = this.docker.getContainer(this.id);
      await container.stop();
      this._running = false;
      console.log(`Container ${this.name} is stopped.`);
    } else {
      console.log(`Container ${this.name} is not running. Skip stopping.`);
    }
  }

  /**
   * Create a new container.
   *
   * @returns {Promise.<*>}
   */
  async create() {
    if (this.id) {
      throw new Error(`This container already exists. Cannot create again.`);
    }
    const createOptions = {
      ExposedPorts: {},
      HostConfig: {
        Binds: [],
        PortBindings: {},
        Privileged: true
      },
      Volumes: {}
    };
    const ports = [5700, 9999];
    ports.forEach((port) => {
      createOptions.ExposedPorts[`${port}/tcp`] = {};
      createOptions.HostConfig.PortBindings[`${port}/tcp`] = [{ HostPort: `${port}` }];
    });
    const volumes = [
      '/usr/.security',
      '/etc/.sec',
      '/linkedge/gateway/build/.sst',
      '/tmp/var/run',
      '/linkedge/run'
    ];
    volumes.forEach((volume, index) => {
      createOptions.Volumes[volume] = {};
      createOptions.HostConfig.Binds.push(`linkedge_vol${index + 1}:${volume}`);
    });

    console.log('\n\nPlease enter secret triples for setup:');
    const triples = await this._readTriples();

    const setupOptions = Object.assign({}, createOptions);
    setupOptions.name = 'linkedge-debug-setup';
    setupOptions.Entrypoint = ['/linkedge/gateway/build/script/set_gw_triple.sh'];
    setupOptions.HostConfig = Object.assign({}, createOptions.HostConfig, {
      AutoRemove: true
    });

    console.log(`Applying secret triples...`);
    await this.docker.run(this.image, [triples.key, triples.name, triples.secret],
      process.output, setupOptions);
    // Wait for 3 seconds ...
    await new Promise((resolve) => {
      setTimeout(() => resolve(), 3000);
    });

    console.log(`Create container with name ${this.name}.`);
    createOptions.name = this.name;
    createOptions.Image = this.image;
    createOptions.RestartPolicy = { name: 'unless-stopped' };
    const container = await this.docker.createContainer(createOptions);
    this.id = container.id;
    return this.id;
  }

  /**
   * Return if the container is created or not.
   *
   * @returns {boolean}
   */
  isCreated() {
    return !!this.id;
  }

  /**
   * Return if the container is running or not.
   *
   * @returns {boolean|*}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Extract an archive of files or folders from source on local filesystem to the target
   * directory in the container.
   *
   * @param source a archive of files or folders
   * @param target the target directory in the container
   * @returns {Promise.<void>}
   */
  async copy(source, target) {
    await this.bind();
    if (!this.isCreated()) {
      throw new Error('No local container found. Please run `fun edge start` to start one.');
    }
    if (!this.isRunning()) {
      throw new Error('Local container is not running. Please run `fun edge start` to start it.');
    }
    // Make sure the target path exists.
    const container = this.docker.getContainer(this.id);
    const exec = await container.exec({
      Cmd: ['mkdir', '-p', `${target}`],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });
    await new Promise((resolve, reject) => {
      exec.start({hijack: true}, (err, stream) => {
        stream.on('end', () => {
          resolve();
        });
        stream.on('error', (err) => {
          reject(err);
        });
        // FIXME There is no 'end' event being received on windows. Send one manually.
        if (process.platform === 'win32') {
          setTimeout(() => stream.end(), 0);
        }
      });
    });
    // Copy to the target path.
    await container.putArchive(source, {
      path: target
    });
  }

  async _bind(image, name = undefined) {
    debug(`Trying to find a local container ${name} (${image}).`);
    const options = {
      all: true,
      filters: {
        ancestor: [image]
      }
    };
    if (name) {
      options.filters.name = [name];
    }
    const [head] = await this.docker.listContainers(options);
    if (head) {
      this.id = head.Id;
      this._running = head.State === 'running';
      debug(`Bound to the local container ${name} (${image}).`);
    }
    return head;
  }

  async _readTriples() {
    const inquirer = require('inquirer');
    const questions = [
      {
        type: 'input',
        name: 'key',
        message: 'Product key',
        validate: function(value) {
          if (/^[A-Za-z0-9]{10,}$/.test(value)) {
            return true;
          }
          return 'Please enter a valid product key. Allowed characters: ' +
            '[A-Za-z0-9], length: at least 10.';
        }
      },
      {
        type: 'input',
        name: 'name',
        message: 'Device name',
        validate: function(value) {
          if (/^[\w-@:.]{4,32}$/.test(value)) {
            return true;
          }
          return 'Please enter a valid device name. Allowed characters: ' +
            '[A-Za-z0-9_-@:.], length: 4~32.';
        }
      },
      {
        type: 'password',
        message: 'Device secret',
        name: 'secret',
        mask: '*',
        validate: function (value) {
          if (/^[A-Za-z0-9]{32}$/.test(value)) {
            return true;
          }
          return 'Please enter a valid device secret. Allowed characters: ' +
            '[A-Za-z0-9], length: 32.';
        }
      }
    ];
    return await inquirer.prompt(questions);
  }

  /**
   * Return whether the image is downloaded at local.
   *
   * @returns {Promise.<boolean>}
   */
  async hasImage() {
    const images = await this.docker.listImages({
      filter: {
        reference: [this.image]
      }
    });
    return !!images.length;
  }

  /**
   * Pull the container image from the registry.
   *
   * @return {Promise<Void>}
   */
  async pullImage() {
    const stream = await this.docker.pull(this.image);
    return new Promise((resolve, reject) => {
      const onFinished = (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.image);
      };
      const slog = require('single-line-log').stdout;
      const statuses = {};
      const onProgress = (event) => {
        let status = event.status;
        if (event.progress) {
          status = `${event.status} ${event.progress}`;
        }
        if (event.id) {
          statuses[event.id] = status;
        }
        // Print
        let output = '';
        const keys = Object.keys(statuses);
        for (const key of keys) {
          output += key + ': ' + statuses[key] + '\n';
        }
        if (!event.id) {
          output += event.status;
        }
        slog(output);
      };
      this.docker.modem.followProgress(stream, onFinished, onProgress);
    });
  }

  /**
   * Return the image of the edge container.
   *
   * @return {string}
   * @private
   */
  static _getImage() {
    return 'registry.cn-hangzhou.aliyuncs.com/iotedge/edge_x86_alpine:v1.8.2';
  }

  /**
   * Return the name of the edge container.
   *
   * @return {string}
   * @private
   */
  static _getName() {
    return 'linkedge-debug';
  }
}

module.exports = Container;
