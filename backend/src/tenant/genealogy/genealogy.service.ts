import { Injectable } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Member } from '../members/member.entity';

/** Minimal person info for the tree (no sensitive money data). */
export interface PersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'O' | null;
  birthDate: string | null; // 'YYYY-MM-DD'
  photo: string | null;
}

/**
 * A "union" = one co-parenting relationship the person had. Children listed
 * here are the children of this person AND `partner` (or just this person if
 * partner is null = other parent unknown).
 */
export interface Union {
  partner: PersonInfo | null;
  children: TreeNode[];
}

/** A node of the descendant family tree. `person` appears exactly once. */
export interface TreeNode {
  person: PersonInfo;
  unions: Union[];
}

@Injectable()
export class GenealogyService {
  constructor(private readonly tenantRouting: TenantRoutingService) {}

  /**
   * Builds a descendant forest grouped by couples — so the **mother** is
   * always visible next to the father (the classic family-tree look) and each
   * child appears exactly once (under its primary parent: father if known in
   * the family, otherwise mother).
   */
  async fullTree(fam: FamilyContext): Promise<TreeNode[]> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const members = await ds.getRepository(Member).find();
    const byId = new Map(members.map((m) => [m.id, m] as const));

    const info = (m: Member): PersonInfo => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      gender: m.gender,
      birthDate: m.birthDate ? String(m.birthDate).substring(0, 10) : null,
      photo: m.photo,
    });

    // unionMap: primaryId -> (partnerId|'_none_' -> child Members[])
    const unionMap = new Map<string, Map<string, Member[]>>();
    for (const c of members) {
      const fatherIn = !!(c.fatherId && byId.has(c.fatherId));
      const motherIn = !!(c.motherId && byId.has(c.motherId));
      if (!fatherIn && !motherIn) continue; // c is a root (no parents in family)
      // Father wins when known; otherwise mother becomes primary.
      const primaryId = fatherIn ? c.fatherId! : c.motherId!;
      const partnerId = fatherIn ? (motherIn ? c.motherId! : null) : null;
      const key = partnerId ?? '_none_';
      if (!unionMap.has(primaryId)) unionMap.set(primaryId, new Map());
      const sub = unionMap.get(primaryId)!;
      if (!sub.has(key)) sub.set(key, []);
      sub.get(key)!.push(c);
    }

    // Members who appear inline as someone else's partner — used to avoid
    // showing a "lonely" root for the second member of a couple that has no
    // descendants of their own to display.
    const inlinePartners = new Set<string>();
    for (const sub of unionMap.values()) {
      for (const key of sub.keys()) if (key !== '_none_') inlinePartners.add(key);
    }

    const sortChildren = (a: Member, b: Member): number => {
      if (a.birthDate && b.birthDate) return +new Date(a.birthDate) - +new Date(b.birthDate);
      if (a.birthDate) return -1;
      if (b.birthDate) return 1;
      return a.firstName.localeCompare(b.firstName);
    };

    const buildNode = (id: string): TreeNode => {
      const m = byId.get(id)!;
      const sub = unionMap.get(id);
      const unions: Union[] = [];
      if (sub) {
        // Stable ordering: unions with a partner first, then solo.
        const entries = Array.from(sub.entries()).sort(([a], [b]) => {
          if (a === '_none_') return 1;
          if (b === '_none_') return -1;
          return 0;
        });
        for (const [partnerKey, children] of entries) {
          const partner =
            partnerKey !== '_none_' && byId.has(partnerKey) ? info(byId.get(partnerKey)!) : null;
          unions.push({
            partner,
            children: children.sort(sortChildren).map((c) => buildNode(c.id)),
          });
        }
      }
      return { person: info(m), unions };
    };

    const roots: TreeNode[] = [];
    for (const m of members) {
      const hasParent =
        (m.fatherId && byId.has(m.fatherId)) || (m.motherId && byId.has(m.motherId));
      if (hasParent) continue;
      const ownChildren = unionMap.get(m.id);
      const hasOwnChildren = !!ownChildren && Array.from(ownChildren.values()).some((a) => a.length > 0);
      // If they only appear as someone's spouse inline and have no descent of
      // their own → skip the standalone root (avoids a "lonely" duplicate card).
      if (inlinePartners.has(m.id) && !hasOwnChildren) continue;
      roots.push(buildNode(m.id));
    }
    roots.sort(
      (a, b) =>
        a.person.lastName.localeCompare(b.person.lastName) ||
        a.person.firstName.localeCompare(b.person.firstName),
    );
    return roots;
  }
}
