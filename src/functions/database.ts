import { PrismaClient } from '@prisma/client';
import { User } from "discord.js";
import { countingData, joinleaveMessage, joinleaveImage, memberCount, ticketdata } from "~/interfaces/database";

const prisma = new PrismaClient();
logger.info("Prisma client initialized");

export async function getSettings(guildId: string) {
    const settings = await prisma.settings.upsert({
        where: {
            guildId: guildId,
        },
        create: {
            guildId: guildId,
        },
        update: {}
    });

    const joinmessage = JSON.parse(settings.joinmessage || '{}') as joinleaveMessage;
    const joinimage = JSON.parse(settings.joinimage || '{}') as joinleaveImage;
    const leavemessage = JSON.parse(settings.leavemessage || '{}') as joinleaveMessage;
    const leaveimage = JSON.parse(settings.leaveimage || '{}') as joinleaveImage;
    const ticketdata = JSON.parse(settings.ticketdata || '{}') as ticketdata;
    const membercount = JSON.parse(settings.membercount || '{}') as memberCount;
    const wishlistchannel = settings.wishlistchannel
    let counting = JSON.parse(settings.counting || '{}');
    counting.count = parseInt(counting.count) || 0;
    counting.maxcount = parseInt(counting.maxcount) || 0;
    counting = counting as countingData;
    const ticketId = settings.ticketId

    return { joinmessage, joinimage, leavemessage, leaveimage, ticketdata, membercount, wishlistchannel, counting, ticketId };
}

export async function getCountingData(guildId: string) {
    const settings = await prisma.settings.findUnique({
        where: {
            guildId: guildId,
        },
        select: {
            counting: true,
        }
    });

    if (!settings) return null;

    let counting = JSON.parse(settings.counting || '{}');
    counting.count = parseInt(counting.count) || 0;
    counting.maxcount = parseInt(counting.maxcount) || 0;
    counting = counting as countingData;
    return counting;
}

export async function addLicenseKey(
    userId: string,
    licenseKey: string,
    product: string
) {

    const result = await prisma.licenses.upsert({
        where: {
            license_key: licenseKey,
        },
        create: {
            license_key: licenseKey,
            product: product,
            userId: userId,
        },
        update: {},
    });

    return result ? true : false;
}

export async function deleteLicenseKey(licenseKey: string) {
    prisma.licenses.delete({
        where: {
            license_key: licenseKey,
        },
    });
}

export async function addXp(member: User, guildId: string, xp: number) {
    const result = { leveledUp: false, newLevel: 0 };

    await prisma.$transaction(async (tx: any) => {
        let user = await tx.levels.upsert({
            where: {
                userId_guildId: {
                    userId: member.id,
                    guildId: guildId,
                },
            },
            create: {
                guildId: guildId,
                userId: member.id,
                username: member.username,
                xp: xp,
                level: 1,
            },
            update: {
                xp: {
                    increment: xp,
                },
                username: member.username,
            },
        });

        const newXp = user.xp + xp;

        if (newXp >= user.xp_needed) {
            const newLevel = user.level + 1;
            const newXpNeeded = calculateXpNeeded(newLevel);
            await tx.levels.update({
                where: {
                    userId_guildId: {
                        userId: member.id,
                        guildId: guildId,
                    },
                },
                data: {
                    xp: 0,
                    level: newLevel,
                    xp_needed: newXpNeeded,
                    username: member.username,
                },
            });

            result.leveledUp = true;
            result.newLevel = newLevel;
        }
    });

    return result;
}

export async function getXp(userId: string, guildId: string) {
    const user = await prisma.levels.upsert({
        where: {
            userId_guildId: {
                userId: userId,
                guildId: guildId,
            },
        },
        create: {
            userId: userId,
            guildId: guildId,
        },
        update: {},
    });

    return user;
}

export async function getTopUsers(guildId: string, amount: number, page: number) {
    const users = await prisma.levels.findMany({
        where: {
            guildId: guildId,
        },
        orderBy: {
            xp: "desc",
        },
        skip: (page - 1) * amount,
        take: amount,
    });

    return users;
}

function calculateXpNeeded(level: number) {
    return Math.floor(Math.pow(level / 0.015, 1));
}

export function formatOrdinalNumber(number: number): string {
    const suffixes = ["th", "st", "nd", "rd"];
    const remainder = number % 100;

    // If the remainder is between 11 and 13, use "th" suffix
    if (remainder >= 11 && remainder <= 13) {
        return number + "th";
    }

    // Otherwise, use the appropriate suffix based on the last digit
    const lastDigit = number % 10;
    return number + (suffixes[lastDigit] || "th");
}

export default prisma;