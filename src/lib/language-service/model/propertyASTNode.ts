import { ASTNode } from './astNode';
import { StringASTNode } from './stringASTNode';
import { JSONSchema } from '../jsonSchema';
import { ValidationResult, ISchemaCollector } from '../parser/jsonParser';
import { CustomTag } from './customTag';

export class PropertyASTNode extends ASTNode {
  key: StringASTNode;
  value: ASTNode | undefined;

  constructor(
    parent: ASTNode | undefined,
    key: StringASTNode,
    start: number,
    end: number,
    customTag?: CustomTag,
  ) {
    super(parent, 'property', start, end, customTag);
    this.key = key;
    this.key.parent = this;
    this.slot = key.value;
  }

  getChildNodes(): ASTNode[] {
    return this.value ? [this.key, this.value] : [this.key];
  }

  getValue() {
    return this.value;
  }

  setValue(value: ASTNode): boolean {
    this.value = value;
    return value != null;
  }

  validate(
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector,
  ) {
    if (this.value) {
      this.value.validate(schema, validationResult, matchingSchemas);
    }
  }
}