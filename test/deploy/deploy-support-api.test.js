'use strict';

const expect = require('expect.js');
const { processApiParameters } = require('./../../lib/deploy/deploy-support-api');

describe('test process api parameters', () => {

  var requestParameters;
  var serviceParameters;
  var serviceParametersMap;

  beforeEach(() => {
    requestParameters = [
      {
        apiParameterName: 'token',
        location: 'Query',
        parameterType: 'String',
        required: 'REQUIRED',
        defaultValue: 'e'
      }
    ];

    serviceParameters = [{
      serviceParameterName: 'token',
      location: 'PATH',
      parameterType: 'STRING',
      parameterCatalog: 'CONSTANT'
    }];

    serviceParametersMap = [
      {
        serviceParameterName: 'token',
        requestParameterName: 'token'
      }
    ];
  });

  it('test only requestParameters', () => {

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, null, null);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'token',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'token',
      requestParameterName: 'token'
    }]);
  });

  it('test only request parameters and mached service parameters', () => {

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, serviceParameters, null);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'token',
      location: 'PATH',
      parameterType: 'STRING',
      parameterCatalog: 'CONSTANT'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'token',
      requestParameterName: 'token'
    }]);
  });

  it('test only request parameters and serviceParametersMap', () => {
    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, null, serviceParametersMap);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'token',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'token',
      requestParameterName: 'token'
    }]);
  });

  it('test mached requestParameters, serviceParameters and serviceParametersMap', () => {

    serviceParametersMap[0].serviceParameterName = 'rename';

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, null, serviceParametersMap);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'rename',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'rename',
      requestParameterName: 'token'
    }]);
  });

  it('test requestParameters, renamed serviceParameters', () => {

    serviceParameters[0].serviceParameterName = 'rename';

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, serviceParameters, null);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'rename',
      location: 'PATH',
      parameterType: 'STRING',
      parameterCatalog: 'CONSTANT'
    },
    {
      serviceParameterName: 'token',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'token',
      requestParameterName: 'token'
    }]);
  });

  it('test requestParameters, renamed serviceParametersMap', () => {

    serviceParametersMap[0].serviceParameterName = 'renamed';

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, null, serviceParametersMap);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'renamed',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'renamed',
      requestParameterName: 'token'
    }]);
  });

  it('test renamed requestParameters, renamed again serviceParameters, renamed serviceParametersMap', () => {

    serviceParametersMap[0].serviceParameterName = 'renamed';
    serviceParameters[0].serviceParameterName = 'reanmed again';

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, serviceParameters, serviceParametersMap);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'reanmed again',
      location: 'PATH',
      parameterType: 'STRING',
      parameterCatalog: 'CONSTANT'
    },
    {
      serviceParameterName: 'renamed',
      location: 'Query',
      parameterType: 'String',
      parameterCatalog: 'REQUEST'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'renamed',
      requestParameterName: 'token'
    }]);
  });


  it('test requestParameters, renamed serviceParameters, renamed serviceParametersMap, but do nothing', () => {

    serviceParametersMap[0].serviceParameterName = 'renamed';
    serviceParameters[0].serviceParameterName = 'renamed';

    const {
      apiRequestParameters,
      apiServiceParameters,
      apiServiceParametersMap
    } = processApiParameters(requestParameters, serviceParameters, serviceParametersMap);

    expect(apiRequestParameters).to.eql([{
      location: 'Query',
      parameterType: 'String',
      required: 'REQUIRED',
      apiParameterName: 'token',
      defaultValue: 'e'
    }]);

    expect(apiServiceParameters).to.eql([{
      serviceParameterName: 'renamed',
      location: 'PATH',
      parameterType: 'STRING',
      parameterCatalog: 'CONSTANT'
    }]);

    expect(apiServiceParametersMap).to.eql([{
      serviceParameterName: 'renamed',
      requestParameterName: 'token'
    }]);
  });
});