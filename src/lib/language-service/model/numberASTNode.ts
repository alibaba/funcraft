import { ASTNode } from './astNode';
import { JSONSchema } from '../jsonSchema';
import { ValidationResult, ISchemaCollector } from '../parser/jsonParser';

export class NumberASTNode extends ASTNode {
  isInteger: boolean;
  value: number;

  constructor(
    parent: ASTNode | undefined,
    value: number,
    isInteger: boolean,
    start: number,
    end: number,
  ) {
    super(parent, 'number', start, end);
    this.isInteger = isInteger;
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }

  validate(
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector,
  ): void {
    let typeIsInteger = false;
    if (
      schema.type === 'integer' ||
      (
        Array.isArray(schema.type) &&
        (schema.type as string[]).indexOf('integer') >= 0
      )
    ) {
      typeIsInteger =true;
    }
    if (typeIsInteger && this.isInteger) {
      this.type = 'integer';
    }
    super.validate(schema, validationResult, matchingSchemas);
    this.type = 'number';
  }
}