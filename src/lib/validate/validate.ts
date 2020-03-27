import * as _ from 'lodash';
import * as jsYaml from 'js-yaml';
import * as Yaml from 'yaml-ast-parser';
import { magenta, bgBlack, red, yellow, white } from 'colors';
import { buildAstRecursively } from '../language-service/parser/parser';
import { JSONSchemaService } from '../language-service/services/jsonSchemaService';
import { ValidationResult, SchemaCollector, ProblemSeverity, ErrorCodeTable } from '../language-service/parser/jsonParser';
import { mergeTpl } from '../utils/tpl';

async function validate(...tplPaths: string[]) {
  // work around: https://github.com/alibaba/funcraft/issues/676
  if (process.env.IGNORE_TPL_VALIDATION
    && process.env.IGNORE_TPL_VALIDATION !== '0'
    && process.env.IGNORE_TPL_VALIDATION !== 'false'
  ) {
    return;
  }
  const tpl = mergeTpl(...tplPaths);
  const docRoot = buildAstRecursively(undefined, Yaml.load(jsYaml.safeDump(tpl, { noRefs: true })));
  
  const jsonSchemaService = JSONSchemaService.getJSONSchemaService();
  const resolvedSchema = await jsonSchemaService.getSchemaForResource();
  const validationResult = new ValidationResult();
  const matchingSchemas = new SchemaCollector();

  docRoot.validate(resolvedSchema.schema, validationResult, matchingSchemas);
  let errCnt: number = 0;

  validationResult.problems.forEach(problem => {
    if (problem.severity === ProblemSeverity.Error) {
      errCnt++;
    }
    console.log(
      `${bgBlack(white('fun'))} ` +
      ((problem.severity === ProblemSeverity.Error) ? `${bgBlack(red('ERR!'))} ` : `${bgBlack(yellow('WRAN'))} `) +
      `${magenta(ErrorCodeTable[problem.code])} ` +
      `${problem.path.join('/')}: ${problem.message}`
    );
  });

  if (errCnt) {
    throw new Error(`${bgBlack(white('fun'))} ${bgBlack(red('ERR!'))} template is not valid`);
  }
}

module.exports = validate;