import { prisma } from '../lib/prisma';
import { Participant, Prisma } from '@/generated/prisma/client';

export async function findOrCreateParticipant(input: { name: string; email: string }) {
    input.email = input.email.trim().toLowerCase();
    try {
        const newParticipant: Participant = await prisma.participant.create({
                data: {
                    name: input.name,
                    email: input.email,
                    emailVerifiedAt: null
                }
            });
        return newParticipant;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const participant = await prisma.participant.findUnique({
                where: { email: input.email}
            });
        return participant;
    } else {
        throw error;
    }}}