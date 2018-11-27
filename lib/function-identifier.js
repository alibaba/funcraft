'use strict';

const FUNCTION_ID_PATTEN = /(([a-zA-Z_][\w-]{0,127})\/)?([a-zA-Z_][\w-]{0,127})$/;
const SERVICE_NAME_REGEX_INDEX = 2;
const FUNCTION_NAME_REGEX_INDEX = 3;

class FunctionIdentifier {
  constructor(identifier) {
    const results = identifier.match(FUNCTION_ID_PATTEN);
    if (!results) {
      throw new Error(
        `Can't parse the given string as a function identifier: ${identifier}.`
      );
    }
    this._identifier = identifier;
    this._serviceName = results[SERVICE_NAME_REGEX_INDEX];
    this._functionName = results[FUNCTION_NAME_REGEX_INDEX];
  }

  get identifier() {
    return this._identifier;
  }

  get serviceName() {
    return this._serviceName;
  }

  get functionName() {
    return this._functionName;
  }

  toString() {
    return this._identifier;
  }
}

module.exports = FunctionIdentifier;