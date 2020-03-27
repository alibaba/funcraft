import { ASTNode } from './astNode';

export class BooleanASTNode extends ASTNode {
  private value: boolean;

  constructor(
    parent: ASTNode | undefined,
    value: boolean,
    start: number,
    end: number,
  ) {
    super(parent, 'boolean', start, end);
    this.value = value;
  }

  getValue() {
    return this.value;
  }
}