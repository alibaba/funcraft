import { ASTNode } from './astNode';
import { PropertyASTNode } from './propertyASTNode';
import { JSONSchema, JSONSchemaMap } from '../jsonSchema';
import { ValidationResult, ISchemaCollector, ProblemSeverity, ErrorCode } from '../parser/jsonParser';

export class ObjectASTNode extends ASTNode {
  properties: PropertyASTNode[];

  constructor(
    parent: ASTNode | undefined,
    start: number,
    end: number,
  ) {
    super(parent, 'object', start, end);
    this.properties = [];
  }

  getChildNodes(): ASTNode[] {
    return this.properties;
  }

  getValue(): any {
    const result: any = {};
    this.properties.forEach(p => {
      const v = p.value && p.value.getValue();
      if (typeof v !== undefined) {
        result[p.key.getValue()] = v;
      }
    });
    return result;
  }

  addProperty(node: PropertyASTNode): boolean {
    if (node) {
      this.properties.push(node);
      return true;
    }
    return false;
  }

  validate(
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector,
  ): void {
    if (
      schema.type === 'string' &&
      this.properties.length === 1 &&
      this.properties[0].customTag
    ) {
      return;
    }
    super.validate(schema, validationResult, matchingSchemas);
    const seenKeys: { [key: string]: ASTNode } = Object.create(null);
    const unprocessedProperties: string[] = [];
    this.properties.forEach(node => {
      const key = node.key.value;
      if (!node.value) {
        return;
      }
      seenKeys[key] = node.value;
      unprocessedProperties.push(key);
    });
    const propertyProcessed = (prop: string) => {
      let index = unprocessedProperties.indexOf(prop);
      while (index >= 0) {
        unprocessedProperties.splice(index, 1);
        index = unprocessedProperties.indexOf(prop);
      }
    }
    if (Array.isArray(schema.required)) {
      schema.required.forEach((propertyName: string) => {
        if (!seenKeys[propertyName]) {
          const key =
            this.parent &&
            (this.parent as PropertyASTNode).key;
          const location = key
            ? { start: key.start, end: key.end }
            : { start: this.start, end: this.start + 1 };
          validationResult.problems.push({
            location,
            severity: ProblemSeverity.Error,
            code: ErrorCode.PropertyRequired,
            message:
              'Missing property ' +
              propertyName,
            path: this.getPath(),
          });
        }
      });
    }
    if (schema.properties) {
      Object.keys(schema.properties).forEach((propertyName: string) => {
        propertyProcessed(propertyName);
        const prop = schema.properties && schema.properties[propertyName];
        const child = seenKeys[propertyName];
        if (child) {
          const propertyValidationResult = new ValidationResult();
          child.validate(
            prop as JSONSchema,
            propertyValidationResult,
            matchingSchemas,
          );
          validationResult.mergePropertyMatch(propertyValidationResult);
        }
      });
    }
    if (schema.patternProperties) {
      Object.keys(schema.patternProperties).forEach(
        (propertyPattern: string) => {
          const regex = new RegExp(propertyPattern);
          unprocessedProperties
            .slice(0)
            .forEach((propertyName: string) => {
              if (regex.test(propertyName)) {
                propertyProcessed(propertyName);
                const child = seenKeys[propertyName];
                if (child) {
                  const propertyValidationResult = new ValidationResult();
                  child.validate(
                    (schema.patternProperties as JSONSchemaMap)[propertyPattern],
                    propertyValidationResult,
                    matchingSchemas,
                  );
                  validationResult.mergePropertyMatch(propertyValidationResult);
                }
              }
            });
        }
      );
    }
    if (schema.additionalProperties === false) {
      if (unprocessedProperties.length > 0) {
        unprocessedProperties.forEach((propertyName: string) => {
          const child = seenKeys[propertyName];
          if (child) {
            let propertyNode = null;
            if (child.type !== 'property') {
              propertyNode = child.parent as PropertyASTNode
              if (propertyNode.type === 'object') {
                propertyNode = (<any>propertyNode).properties[0]
              }
            } else {
              propertyNode = child;
            }
            validationResult.problems.push({
              location: {
                start: propertyNode.key.start,
                end: propertyNode.key.end,
              },
              severity: ProblemSeverity.Error,
              code: ErrorCode.AdditionalProperty,
              message:
                'Unexpected property ' +
                propertyName,
              path: this.getPath(),
            });
          }
        });
      }
    }
  }
}