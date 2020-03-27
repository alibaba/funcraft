import { ASTNode } from './astNode';

export class StringASTNode extends ASTNode {
  isKey: boolean;
  value: string;

  constructor(
    parent: ASTNode | undefined,
    isKey: boolean,
    value: string,
    start: number,
    end: number,
  ) {
    super(parent, 'string', start, end);
    this.isKey = isKey;
    this.value = value;
  }

  getValue() {
    return this.value;
  }
}