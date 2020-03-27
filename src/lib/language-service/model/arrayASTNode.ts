import { ASTNode } from './astNode';
import { JSONSchema } from '../jsonSchema';
import { ValidationResult, ISchemaCollector } from '../parser/jsonParser';

export class ArrayASTNode extends ASTNode {
  items: ASTNode[];

  constructor(
    parent: ASTNode | undefined,
    start: number,
    end: number,
  ) {
    super(parent, 'array', start, end);
    this.items = [];
  }

  getChildNodes(): ASTNode[] {
    return this.items;
  }

  getValue(): any {
    return this.items.map(item => item.getValue());
  }

  addItem(item: ASTNode): boolean {
    if (item) {
      this.items.push(item);
      return true;
    }
    return false;
  }

  valdiate(
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector,
  ): void {
    super.validate(schema, validationResult, matchingSchemas);
    this.items.forEach(item => {
      const itemValidationResult = new ValidationResult();
      item.validate(
        schema.items as JSONSchema,
        itemValidationResult,
        matchingSchemas,
      );
      validationResult.mergePropertyMatch(itemValidationResult);
    });
  }
}