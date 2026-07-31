// src/lib/quotation/milestoneCal.ts

export interface MilestoneItem {

    id: string;

    label: string;

    percentage: number;

    amount: number;

}

export interface MilestoneResult {
    milestones: MilestoneItem[];
    total: number;
}

// src/lib/quotation/milestoneCal.ts
// add this export alongside the others

export function normalizeMilestonesFromTemplate(
    template: Array<{ id?: string; label?: string; amount?: number; percentage?: number }>,
    totalPrice: number
): MilestoneItem[] {
    const items = template.map((m, i) => {
        const amount = Number(m.amount) || 0;
        const percentage =
            m.percentage != null && Number.isFinite(Number(m.percentage))
                ? Number(m.percentage)
                : totalPrice > 0
                    ? Number(((amount / totalPrice) * 100).toFixed(2))
                    : 0;

        return {
            id: m.id || `ms_${Date.now()}_${i}_${Math.random().toString(36).substring(2)}`,
            label: m.label || `Milestone ${i + 1}`,
            percentage,
            amount,
        };
    });

    // Snap the last milestone so percentages sum to exactly 100
    if (items.length > 0) {
        const sumExceptLast = items
            .slice(0, -1)
            .reduce((sum, m) => sum + m.percentage, 0);
        const last = items[items.length - 1];
        last.percentage = Number((100 - sumExceptLast).toFixed(2));
    }

    return items;
}
/**
 * Creates an empty milestone
 */
export function createMilestone(
    index: number
): MilestoneItem {

    return {

        id:
            "ms_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substring(2),

        label: `Milestone ${index + 1}`,

        percentage: 0,

        amount: 0

    }

}


export function generateMilestones(
    count: number
): MilestoneItem[] {

    return Array.from(

        { length: count },

        (_, i) => createMilestone(i)

    );

}

export function calculateTotalPercentage(
    milestones: MilestoneItem[]
) {
    const total = milestones.reduce((sum, m) => sum + m.percentage, 0);
    return Number(total.toFixed(2)); // round away float dust
}

export function calculateRemainingPercentage(
    milestones: MilestoneItem[]
) {
    return Number(
        Math.max(0, 100 - calculateTotalPercentage(milestones)).toFixed(2)
    );
}

export function updateMilestonePercentage(

    milestones: MilestoneItem[],

    id: string,

    percentage: number,

    total: number

) {

    return milestones.map(m => {

        if (m.id !== id) return m;

        const safe = Math.min(
            100,
            Math.max(0, Number(percentage) || 0)
        );

        return {

            ...m,

            percentage: safe,

            amount: Number(

                (

                    total * safe / 100

                ).toFixed(2)

            )

        }

    })

}



export function isMilestonePlanValid(

    milestones: MilestoneItem[]

) {

    return calculateTotalPercentage(

        milestones

    ) === 100;

}

/**
 * Adds a milestone
 */
export function addMilestone(
    milestones: MilestoneItem[]
): MilestoneItem[] {
    return [
        ...milestones,
        createMilestone(milestones.length),
    ];
}



/**
 * Removes a milestone
 */
export function removeMilestone(
    milestones: MilestoneItem[],
    id: string
): MilestoneItem[] {
    return milestones.filter(
        (m) => m.id !== id
    );
}

/**
 * Update milestone name
 */
export function updateMilestoneLabel(
    milestones: MilestoneItem[],
    id: string,
    label: string
): MilestoneItem[] {
    return milestones.map((m) =>
        m.id === id
            ? {
                ...m,
                label,
            }
            : m
    );
}


/**
 * Total of all milestones
 */
export function calculateMilestoneTotal(
    milestones: MilestoneItem[]
): number {
    return milestones.reduce(
        (sum, m) => sum + Number(m.amount || 0),
        0
    );
}

/**
 * Returns everything together
 */
export function calculateMilestones(
    milestones: MilestoneItem[]
): MilestoneResult {
    return {
        milestones,
        total: calculateMilestoneTotal(milestones),
    };
}