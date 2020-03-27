import { ASTNode } from './astNode';

export class NullASTNode extends ASTNode {
  constructor(
    parent: ASTNode | undefined,
    start: number,
    end: number,
  ) {
    super(parent, 'null', start, end);
  }

  getValue(): any {
    return null;
  }
}