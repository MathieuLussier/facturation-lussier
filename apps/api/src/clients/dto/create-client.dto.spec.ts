import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

async function errorsFor(obj: Record<string, unknown>) {
  return validate(plainToInstance(CreateClientDto, obj));
}

describe('CreateClientDto — courriel selon le type de client', () => {
  it('particulier (INDIVIDUAL) sans courriel → invalide', async () => {
    const errors = await errorsFor({ type: 'INDIVIDUAL', companyName: 'Jean Tremblay' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('particulier avec courriel valide → valide', async () => {
    const errors = await errorsFor({
      type: 'INDIVIDUAL',
      companyName: 'Jean Tremblay',
      email: 'jean@example.com',
    });
    expect(errors).toHaveLength(0);
  });

  it('société (COMPANY) sans courriel → valide (optionnel)', async () => {
    const errors = await errorsFor({ type: 'COMPANY', companyName: 'Acme inc.' });
    expect(errors).toHaveLength(0);
  });

  it('société sans type explicite (défaut COMPANY) sans courriel → valide', async () => {
    const errors = await errorsFor({ companyName: 'Acme inc.' });
    expect(errors).toHaveLength(0);
  });

  it('courriel fourni mais invalide → invalide (quel que soit le type)', async () => {
    const errors = await errorsFor({ type: 'COMPANY', companyName: 'Acme', email: 'pas-un-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
