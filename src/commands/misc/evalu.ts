import { Command } from '~/types/objects';
import evaluateOptions from '~/options/evaluate'; 
import { evaluate } from 'mathjs';
export const evalu: Command = {
    name: "evaluate",
    description: "Math yes",
    options: evaluateOptions,
    execute: async function (interaction, args) {
        const equation = args.getString('equation', true);
        const result = evaluate(equation);
        interaction.editReply({content: result.toString()});
    }
};
