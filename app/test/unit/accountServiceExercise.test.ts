import { DistrictRepository } from '../../src/repositories/districtRepository';
import { AccountService} from '../../src/services/accountService';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../src/errors';
import { TokenService } from '../../src/auth/tokenService';

describe('spy', () => {
    it('passes the new role to the repository and returns the updated user', async () => {
        const dummyDistricts: DistrictRepository = {
            findAll: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
            findById: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
        };

        const dummyTokens: TokenService = {
          issue: jest.fn(),
          verify: () => {
            throw new Error('dummy TokenService should not be used');
          },
        };

        const stubUserRepository = {
            findById: jest.fn().mockResolvedValue({ id: 11, nationalId: '1509900000017', role: 'VOTER', districtId: 'CM-1' }),
            findByNationalId: jest.fn(),
            create: jest.fn(),
            updateRole: jest.fn().mockResolvedValue({ id: 11, nationalId: '1509900000017', role: 'COMMISSIONER', districtId: 'CM-1' }),
        };

        const accounts = new AccountService(stubUserRepository, dummyDistricts, dummyTokens);

        const user = await accounts.changeRole(11, 'VOTER');

        expect(stubUserRepository.updateRole).toHaveBeenCalledWith(11, 'VOTER');
        expect(user).toMatchObject({ nationalId: '1509900000017', role: 'COMMISSIONER', districtId: 'CM-1' });
    });

    it('it should throw NotFoundError when user is not found', async () => {
        const dummyDistricts: DistrictRepository = {
            findAll: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
            findById: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
        };

        const dummyTokens: TokenService = {
          issue: jest.fn(),
          verify: () => {
            throw new Error('dummy TokenService should not be used');
          },
        };

        const stubUserRepository = {
            findById: jest.fn().mockResolvedValue({ id: 11, nationalId: '1509900000017', role: 'VOTER', districtId: 'CM-1' }),
            findByNationalId: jest.fn(),
            create: jest.fn(),
            updateRole: jest.fn().mockResolvedValue(null),
        };

        const accounts = new AccountService(stubUserRepository, dummyDistricts, dummyTokens);

        await expect(accounts.changeRole(11, 'VOTER')).rejects.toThrow(NotFoundError);
    });

    it('refuses to make anyone an ADMIN', async () => {
        const dummyDistricts: DistrictRepository = {
            findAll: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
            findById: () => {
                throw new Error('dummy DistrictRepository should not be used');
            },
        };

        const dummyTokens: TokenService = {
          issue: jest.fn(),
          verify: () => {
            throw new Error('dummy TokenService should not be used');
          },
        };

        const spyUserRepository = {
            findById: jest.fn(),
            findByNationalId: jest.fn(),
            create: jest.fn(),
            updateRole: jest.fn(),
        };

        const accounts = new AccountService(spyUserRepository, dummyDistricts, dummyTokens);

        await expect(accounts.changeRole(11, 'ADMIN')).rejects.toThrow(ValidationError);
        expect(spyUserRepository.updateRole).not.toHaveBeenCalled();
    });
});