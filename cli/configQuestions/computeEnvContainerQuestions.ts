import inquirer from "inquirer";
import { envType } from "./envType";

export async function askComputeContainerQuestions(envObject: envType) {
  const computeEnvContainerSettings = await inquirer.prompt([
    {
      type: "list",
      name: "ComputeEnvMaxVCPU",
      message:
        "Select the maximum vCPU for your AWS Batch compute environment:",
      choices: ["16 vCPU", "20 vCPU", "24 vCPU", "32 vCPU", "48 vCPU"],
    },
    {
      type: "list",
      name: "containerVCPUMemory",
      message: "Select the vCPU and memory allocation for your container",
      choices: [
        "2 vCPU - 4096 MiB",
        "4 vCPU - 8192 MiB",
        "8 vCPU - 16384 MiB",
        "16 vCPU - 32768 MiB",
      ],
    },
  ]);

  const computeEnvVCPU = {
    "16 vCPU": 16,
    "20 vCPU": 20,
    "24 vCPU": 24,
    "32 vCPU": 32,
    "48 vCPU": 48,
  };

  const containerVCPUMemory = {
    "2 vCPU - 4096 MiB": [2, 4096],
    "4 vCPU - 8192 MiB": [4, 8192],
    "8 vCPU - 16384 MiB": [8, 16384],
    "16 vCPU - 32768 MiB": [16, 32768],
  };

  Object.assign(envObject, {
    compute_env_vcpu:
      computeEnvVCPU[
        computeEnvContainerSettings.ComputeEnvMaxVCPU as keyof typeof computeEnvVCPU
      ],
    container_vcpu:
      containerVCPUMemory[
        computeEnvContainerSettings.containerVCPUMemory as keyof typeof containerVCPUMemory
      ][0],
    container_memory:
      containerVCPUMemory[
        computeEnvContainerSettings.containerVCPUMemory as keyof typeof containerVCPUMemory
      ][1],
  });

  return computeEnvContainerSettings;
}
