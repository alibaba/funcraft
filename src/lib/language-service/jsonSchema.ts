export interface JSONSchema {
  id?: string;
  $schema?: string;
  type?: string | string[];
  title?: string;
  default?: any;
  definitions?: JSONSchemaMap;
  description?: string;
  properties?: JSONSchemaMap;
  patternProperties?: JSONSchemaMap;
  additionalProperties?: any;
  minProperties?: number;
  maxProperties?: number;
  dependencies?: JSONSchemaMap | string[];
  items?: any;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  additionalItems?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  required?: string[];
  firstProperty?: string[];
  $ref?: string;
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  enum?: any[];
  format?: string;
  errorMessage?: string;
  patternErrorMessage?: string;
  deprecationMessage?: string;
  doNotSuggest?: boolean;
  enumDescriptions?: string[];
  ignoreCase?: string;
  aliases?: string[];
  document?: { [key: string]: string };
  $id?: string;
  insertText?: string;
  triggerSuggest?: boolean;
}

export interface JSONSchemaMap {
  [name: string]: JSONSchema;
}
