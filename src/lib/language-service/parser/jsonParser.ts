import { JSONSchema } from '../jsonSchema';
import { ASTNode } from '../model/astNode';

export interface IRange {
  start: number;
  end: number;
}

export enum ErrorCode {
  Undefined = 0,
  TypeError = 1,
  EnumValueMismatch = 2,
  PropertyRequired = 3,
  AdditionalProperty = 4,
  MaxOneMatch = 5,
}

export const ErrorCodeTable: any = {
  [ErrorCode.TypeError]: 'type',
  [ErrorCode.EnumValueMismatch]: 'value',
  [ErrorCode.PropertyRequired]: 'required',
  [ErrorCode.AdditionalProperty]: 'additional',
  [ErrorCode.MaxOneMatch]: 'one',
};

export enum ProblemSeverity {
  Error,
  Warning,
}

export interface IProblem {
  location: IRange;
  severity: ProblemSeverity;
  code?: ErrorCode;
  message: string;
  path: string[];
}

/**
 * 该接口表明某个 AST 节点对应的 Schema 中的定义块
 */
export interface IApplicableSchema {
  node: ASTNode;
  schema: JSONSchema;
}

/**
 * 用于收集所有的 AST 节点对应的 Schema 中的定义块
 */
export interface ISchemaCollector {
  schemas: IApplicableSchema[];
  add(schema: IApplicableSchema): void;
  merge(other: ISchemaCollector): void;
  newSub(): ISchemaCollector;
}

export class SchemaCollector implements ISchemaCollector {
  schemas: IApplicableSchema[] = [];
  add(schema: IApplicableSchema): void {
    this.schemas.push(schema);
  }
  merge(other: ISchemaCollector): void {
    this.schemas.push(...other.schemas);
  }
  newSub(): ISchemaCollector {
    return new SchemaCollector();
  }
}

export class ValidationResult {
  problems: IProblem[];
  propertiesMatches: number;
  propertiesValueMatches: number;
  primaryValueMatches: number;
  enumValueMatch: boolean;
  enumValues: any[];
  warnings: any[];
  errors: any[];

  constructor() {
    this.problems = [];
    this.propertiesMatches = 0;
    this.propertiesValueMatches = 0;
    this.primaryValueMatches = 0;
    this.enumValueMatch = false;
    this.enumValues = [];
    this.warnings = [];
    this.errors = [];
  }

  hasProblems(): boolean {
    return !!this.problems.length;
  }

  mergeAll(validationResults: ValidationResult[]): void {
    validationResults.forEach(validationResult => {
      this.merge(validationResult);
    });
  }

  merge(validationResult: ValidationResult): void {
    this.problems = this.problems.concat(validationResult.problems);
  }

  mergeEnumValues(validationResult: ValidationResult): void {
    // 如果当前的 validationResult 以及传递进来的 validationResult
    // 都没有匹配上 enum 值
    // 并且两者都有存在的 Enum 值
    // 那么修改当前的 validationResult 中针对 Enum 不匹配的报错提示信息（结合两者的 Enum 列表）
    if (
      !this.enumValueMatch &&
      !validationResult.enumValueMatch &&
      this.enumValues &&
      validationResult.enumValues
    ) {
      this.enumValues = this.enumValues.concat(validationResult.enumValues);
      for (const error of this.problems) {
        if (error.code === ErrorCode.EnumValueMismatch) {
          error.message =
            'enumWarning: ' +
            'Value is not accepted. Valid values:' +
            this.enumValues.map(v => JSON.stringify(v)).join(', ');
        }
      }
    }
  }

  mergePropertyMatch(propertyValidationResult: ValidationResult): void {
    this.merge(propertyValidationResult);
    this.propertiesMatches++;
    // 如果子元素的验证结果匹配了 Enum
    // 或当前元素验证无问题并且子元素有其子元素的属性验证信息
    // 记为当前元素的属性值验证 + 1
    if (
      propertyValidationResult.enumValueMatch ||
      (!this.hasProblems() && propertyValidationResult.propertiesMatches)
    ) {
      this.propertiesValueMatches++;
    }
    // 如果子元素有 Enum 匹配并且 Enum 的可选值只有一个
    // 记为当前验证结果有一次 主值 匹配
    if (
      propertyValidationResult.enumValueMatch &&
      propertyValidationResult.enumValues &&
      propertyValidationResult.enumValues.length === 1
    ) {
      this.primaryValueMatches++;
    }
  }

  compareGeneric(other: ValidationResult): number {
    if (this.hasProblems() !== other.hasProblems()) {
      return this.hasProblems() ? -1 : 1;
    }
    if (this.enumValueMatch !== other.enumValueMatch) {
      return other.enumValueMatch ? -1 : 1;
    }
    if (this.propertiesValueMatches !== other.propertiesValueMatches) {
      return this.propertiesValueMatches - other.propertiesValueMatches;
    }
    if (this.primaryValueMatches !== other.primaryValueMatches) {
      return this.primaryValueMatches - other.primaryValueMatches;
    }
    return this.propertiesMatches - other.propertiesMatches;
  }

}