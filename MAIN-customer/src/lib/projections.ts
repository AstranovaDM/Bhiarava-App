import type { Person, Plot, PlatformSeed } from "./seed";

export function projectPlotForAgent(plot: Plot, seed: PlatformSeed, agentId: string) {
  const customer = plot.customerId ? seed.customers.find((c) => c.id === plot.customerId) : undefined;
  const owns = Boolean(plot.agentId === agentId || customer?.agentId === agentId);
  return {
    id: plot.id,
    number: plot.number,
    status: plot.status,
    area: plot.area,
    price: plot.price,
    facing: plot.facing,
    projectId: plot.projectId,
    customer:
      owns && customer
        ? { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
        : null,
    redacted: Boolean(customer && !owns),
  };
}

export function projectPlotForCustomer(plot: Plot) {
  const detailVisible = plot.status === "AVAILABLE" || plot.status === "RESALE_AVAILABLE";
  return {
    id: plot.id,
    number: plot.number,
    status: plot.status,
    area: detailVisible ? plot.area : null,
    price: detailVisible ? plot.price : null,
    facing: detailVisible ? plot.facing : null,
    detailVisible,
  };
}

export function customersForAgent(seed: PlatformSeed, agentId: string): Person[] {
  return seed.customers.filter((c) => c.agentId === agentId);
}
