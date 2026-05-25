import { Injectable } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Member } from '../members/member.entity';

export interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  fatherId: string | null;
  motherId: string | null;
  photo: string | null;
  children: TreeNode[];
}

@Injectable()
export class GenealogyService {
  constructor(private readonly tenantRouting: TenantRoutingService) {}

  /**
   * Returns the family as a forest of trees rooted on members without parents.
   * Designed to feed the mobile tree visualization directly.
   */
  async fullTree(fam: FamilyContext): Promise<TreeNode[]> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const members = await ds.getRepository(Member).find();
    const byId = new Map<string, TreeNode>();
    for (const m of members) {
      byId.set(m.id, {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        birthDate: m.birthDate,
        fatherId: m.fatherId,
        motherId: m.motherId,
        photo: m.photo,
        children: [],
      });
    }
    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      const parentId = node.fatherId ?? node.motherId;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}
