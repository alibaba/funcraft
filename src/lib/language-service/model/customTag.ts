import * as _ from 'lodash';

export type TagKind = 'sequence' | 'scalar' | 'mapping';

export interface CustomTag {
  tag: string;
  kind: TagKind;
  propertyName: string;
  description?: string;
}

/* eslint-disable max-len */
export const CUSTOM_TAGS: CustomTag[] = [
  {
    tag: '!Str',
    kind: 'scalar',
    propertyName: 'Fn::Str'
  },
  {
    tag: '!Base64Encode',
    kind: 'scalar',
    propertyName: 'Fn::Base64Encode'
  },
  {
    tag: '!Base64Decode',
    kind: 'scalar',
    propertyName: 'Fn::Base64Decode'
  },
  {
    tag: '!FindInMap',
    kind: 'sequence',
    propertyName: 'Fn::FindInMap',
    description:
      'The intrinsic function Fn::FindInMap returns the value corresponding to keys in a two-level map that is declared in the Mappings section.'
  },
  {
    tag: '!GetAtt',
    kind: 'scalar',
    propertyName: 'Fn::GetAtt',
    description:
      'The Fn::GetAtt intrinsic function returns the value of an attribute from a resource in the template.'
  },
  {
    tag: '!Join',
    kind: 'sequence',
    propertyName: 'Fn::Join',
    description:
      'The intrinsic function Fn::Join appends a set of values into a single value, separated by the specified delimiter.'
  },
  {
    tag: '!Select',
    kind: 'sequence',
    propertyName: 'Fn::Select',
    description:
      'The intrinsic function Fn::Select returns a single object from a list of objects by index.'
  },
  {
    tag: '!Sub',
    kind: 'sequence',
    propertyName: 'Fn::Sub'
  },
  {
    tag: '!Ref',
    kind: 'scalar',
    propertyName: 'Ref',
    description:
      'The intrinsic function Ref returns the value of the specified parameter or resource.'
  },
  {
    tag: '!GetAZs',
    kind: 'scalar',
    propertyName: 'Fn::GetAZs',
    description:
      'The intrinsic function Fn::GetAZs returns an array that lists Availability Zones for a specified region.'
  },
  {
    tag: '!Replace',
    kind: 'sequence',
    propertyName: 'Fn::Replace'
  },
  {
    tag: '!Split',
    kind: 'sequence',
    propertyName: 'Fn::Split',
    description:
      'To split a string into a list of string values so that you can select an element from the resulting string list, use the Fn::Split intrinsic function.'
  },
  {
    tag: '!Equals',
    kind: 'sequence',
    propertyName: 'Fn::Equals',
    description: 'Compares if two values are equal.'
  },
  {
    tag: '!And',
    kind: 'sequence',
    propertyName: 'Fn::And',
    description:
      'Returns true if all the specified conditions evaluate to true, or returns false if any one of the conditions evaluates to false.'
  },
  {
    tag: '!Or',
    kind: 'sequence',
    propertyName: 'Fn::Or',
    description:
      'Returns true if any one of the specified conditions evaluate to true, or returns false if all of the conditions evaluates to false.'
  },
  {
    tag: '!Not',
    kind: 'sequence',
    propertyName: 'Fn::Not',
    description:
      'Returns true for a condition that evaluates to false or returns false for a condition that evaluates to true.'
  },
  {
    tag: '!If',
    kind: 'sequence',
    propertyName: 'Fn::If',
    description:
      'Returns one value if the specified condition evaluates to true and another value if the specified condition evaluates to false.'
  },
  {
    tag: '!ListMerge',
    kind: 'sequence',
    propertyName: 'Fn::ListMerge'
  },
  {
    tag: '!GetJsonValue',
    kind: 'sequence',
    propertyName: 'Fn::GetJsonValue'
  },
  {
    tag: '!MergeMapToList',
    kind: 'sequence',
    propertyName: 'Fn::MergeMapToList'
  },
  {
    tag: '!Avg',
    kind: 'sequence',
    propertyName: 'Fn::Avg'
  },
  {
    tag: '!SelectMapList',
    kind: 'sequence',
    propertyName: 'Fn::SelectMapList'
  },
  {
    tag: '!Add',
    kind: 'sequence',
    propertyName: 'Fn::Add'
  },
  {
    tag: '!Calculate',
    kind: 'sequence',
    propertyName: 'Fn::Calculate'
  }
];

export const CUSTOM_TAGS_BY_PROPERTY_NAME: { [key: string]: CustomTag } = _.keyBy(
  CUSTOM_TAGS,
  'propertyName',
);
