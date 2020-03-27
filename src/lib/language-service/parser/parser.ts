import * as Yaml from 'yaml-ast-parser';
import { ASTNode } from '../model/astNode';
import { NullASTNode } from '../model/nullASTNode';
import { ObjectASTNode } from '../model/objectASTNode';
import { PropertyASTNode } from '../model/propertyASTNode';
import { StringASTNode } from '../model/stringASTNode';
import { ArrayASTNode } from '../model/arrayASTNode';
import { BooleanASTNode } from '../model/booleanASTNode';
import { NumberASTNode } from '../model/numberASTNode';
import { CUSTOM_TAGS_BY_PROPERTY_NAME } from '../model/customTag';

/**
 * 判断该节点的跨度是否包含偏移量
 * 如果包含，判断该节点的所有后代是否符合条件，并返回该节点
 * 在判断后代的过程中，如果某个后代符合条件，则将其放入收集器中
 * @param node
 * @param collector
 * @param offset
 */
function findNode(node: ASTNode, collector: ASTNode[], offset: number): ASTNode | undefined {
  if (offset >= node.start && offset <= node.end) {
    const children = node.getChildNodes();
    for (const child of children) {
      if (child.start > offset) { // 初步的筛选，如果 start 大于 offset，肯定不符合条件
        continue;
      }
      const item = findNode(child, collector, offset);
      if (item) {
        collector.push(item); // 后代符合条件，放入收集器中
      }
    }
    return node;
  }
}

/**
 * 根据指定的偏移量在 AST 树中找到跨度最小的节点
 * 算法思路：
 * 获取根节点及其后代跨度范围包含偏移量的所有节点
 * 比较符合条件的所有节点，取出跨度最小的节点
 * @param root
 * @param offset
 */
export function getNodeFromOffset(root: ASTNode, offset: number): ASTNode | undefined {
  const collector: ASTNode[] = [];
  const foundNode = findNode(root, collector, offset);
  let curMinDist = Number.MAX_VALUE;
  let curMinNode = null;
  collector.forEach(node => {
    const dist = node.end - node.start;
    if (dist < curMinDist) {
      curMinDist = dist;
      curMinNode = node;
    }
  });
  return curMinNode || foundNode;
}

export function buildAstRecursively(parent: ASTNode | undefined, node: Yaml.YAMLNode): ASTNode {
  if (!node) {
    return new NullASTNode(parent, 0, 0);
  }

  switch (node.kind) {
    case Yaml.Kind.MAP: {
      const instance = node as Yaml.YamlMap;
      const result = new ObjectASTNode(
        parent,
        instance.startPosition,
        instance.endPosition,
      );
      for (const mapping of instance.mappings) {
        result.addProperty(
          buildAstRecursively(result, mapping) as PropertyASTNode,
        );
      }
      return result;
    }
    case Yaml.Kind.MAPPING: {
      const instance = node as Yaml.YAMLMapping;
      const key = instance.key;
      const keyNode = new StringASTNode(
        parent,
        true,
        key.value,
        key.startPosition,
        key.endPosition,
      );
      const customTag = CUSTOM_TAGS_BY_PROPERTY_NAME[key.value];
      const result = new PropertyASTNode(parent, keyNode, keyNode.start, instance.endPosition, customTag);

      const valueNode = instance.value
        ? buildAstRecursively(result, instance.value)
        : new NullASTNode(result, instance.endPosition, instance.endPosition);
      result.setValue(valueNode);
      return result;
    }
    case Yaml.Kind.SEQ: {
      const instance = node as Yaml.YAMLSequence;
      const result = new ArrayASTNode(
        parent,
        instance.startPosition,
        instance.endPosition,
      );
      for (const item of instance.items) {
        const itemNode = item === null
          ? new NullASTNode(parent, instance.endPosition, instance.endPosition)
          : buildAstRecursively(result, item);
        result.addItem(itemNode);
      }
      return result;
    }
    case Yaml.Kind.SCALAR: {
      const instance = node as Yaml.YAMLScalar;
      const type = Yaml.determineScalarType(instance);
      const value = instance.value;
      switch (type) {
        case Yaml.ScalarType.null: {
          return new StringASTNode(parent, false, '', instance.startPosition, instance.endPosition);
        }
        case Yaml.ScalarType.bool: {
          return new BooleanASTNode(parent, Yaml.parseYamlBoolean(value), instance.startPosition, instance.endPosition);
        }
        case Yaml.ScalarType.int: {
          return new NumberASTNode(parent, Yaml.parseYamlInteger(value), true, instance.startPosition, instance.endPosition);
        }
        case Yaml.ScalarType.float: {
          return new NumberASTNode(parent, Yaml.parseYamlFloat(value), false, instance.startPosition, instance.endPosition);
        }
        case Yaml.ScalarType.string: {
          return new StringASTNode(parent, false, value, instance.startPosition, instance.endPosition);
        }
      }
    }
  }
  return new NullASTNode(parent, 0, 0);
}