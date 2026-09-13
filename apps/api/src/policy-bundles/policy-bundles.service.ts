import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// GAP encontrado ao montar o docker-compose do OPAL: nada neste
// repositorio ainda ESCREVE em PolicyBundle. O compilador
// (packages/rbac-core/src/index.ts, `compileDataBundle`) existe, mas
// nenhum service chama ele quando um Role/Permission/Profile muda. Este
// service so LE o ultimo bundle publicado -- o job que recompila e grava
// um novo PolicyBundle a cada mudanca de RBAC ainda precisa ser escrito
// (candidato natural: um listener/hook nos services de Roles/Profiles).
@Injectable()
export class PolicyBundlesService {
  constructor(private readonly prisma: PrismaService) {}

  // Endpoint consumido pelo OPAL server como "external data source" (ver
  // padrao documentado em docs do OPAL: GET com JWT do OPAL, retorna o
  // JSON que vira `data` no OPA). Por enquanto busca sem RLS porque o
  // OPAL nao autentica como um tenant especifico -- ele pede o bundle de
  // UM tenant por vez, then o tenantId vem da propria rota.
  async getLatestData(tenantId: string) {
    const bundle = await this.prisma.policyBundle.findFirst({
      where: { tenantId },
      orderBy: { version: 'desc' },
    });

    if (!bundle) {
      throw new NotFoundException(
        `Nenhum PolicyBundle publicado para o tenant ${tenantId} ainda -- o job de compilacao (pendente, ver comentario do service) precisa rodar pelo menos uma vez`,
      );
    }

    return bundle.dataJson;
  }
}
