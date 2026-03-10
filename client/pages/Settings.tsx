import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  LLMProvider,
  LLMConfig,
  configStore,
  createLLMProvider,
} from "@/lib/llm-service";
import { Loader, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

const PROVIDERS: { id: LLMProvider; name: string; models: string[] }[] = [
  {
    id: "zai",
    name: "Z.ai",
    models: ["default", "gpt-4", "claude-3", "mistral"],
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
    ],
  },
  {
    id: "gpt4",
    name: "GPT-4 (OpenAI)",
    models: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  },
];

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");

  const [config, setConfig] = useState<LLMConfig>({
    provider: "claude",
    apiKey: "",
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    maxTokens: 2000,
  });

  // Load saved config on mount
  useEffect(() => {
    const saved = configStore.load();
    if (saved) {
      setConfig(saved);
      // Check if it was previously validated
      setValidationStatus("valid");
    }
  }, []);

  const selectedProvider = PROVIDERS.find((p) => p.id === config.provider);
  const availableModels = selectedProvider?.models || [];

  const handleProviderChange = (provider: LLMProvider) => {
    const newProvider = PROVIDERS.find((p) => p.id === provider)!;
    setConfig({
      ...config,
      provider,
      model: newProvider.models[0],
    });
    setValidationStatus("idle");
  };

  const handleModelChange = (model: string) => {
    setConfig({ ...config, model });
    setValidationStatus("idle");
  };

  const handleApiKeyChange = (apiKey: string) => {
    setConfig({ ...config, apiKey });
    setValidationStatus("idle");
  };

  const handleTemperatureChange = (temp: string) => {
    const temperature = parseFloat(temp) || 0.7;
    setConfig({ ...config, temperature: Math.max(0, Math.min(2, temperature)) });
  };

  const handleMaxTokensChange = (tokens: string) => {
    const maxTokens = parseInt(tokens) || 2000;
    setConfig({ ...config, maxTokens: Math.max(100, maxTokens) });
  };

  const handleTestConnection = async () => {
    if (!config.apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const provider = createLLMProvider(config);
      const isValid = await provider.validateConfig();

      if (isValid) {
        setValidationStatus("valid");
        toast({
          title: "Success",
          description: `${selectedProvider?.name} connection verified!`,
        });
      } else {
        setValidationStatus("invalid");
        toast({
          title: "Error",
          description: "Failed to validate API key. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setValidationStatus("invalid");
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (validationStatus !== "valid") {
      toast({
        title: "Error",
        description: "Please test your connection first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      configStore.save(config);
      toast({
        title: "Success",
        description: "Configuration saved successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all settings?")) {
      configStore.clear();
      setConfig({
        provider: "claude",
        apiKey: "",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.7,
        maxTokens: 2000,
      });
      setValidationStatus("idle");
      toast({
        title: "Cleared",
        description: "All settings have been cleared",
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
              Configure your LLM provider and API credentials
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl space-y-6">
            {/* LLM Provider Selection */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                LLM Provider
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Select Provider
                  </label>
                  <Select value={config.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="w-full bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card dark:bg-card border-border dark:border-border">
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Model
                  </label>
                  <Select value={config.model} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-full bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card dark:bg-card border-border dark:border-border">
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* API Credentials */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                API Credentials
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={config.apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={`Enter your ${selectedProvider?.name} API key`}
                      className="pr-10 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                    Your API key is stored securely and never shared.
                  </p>
                </div>
              </div>
            </div>

            {/* Model Parameters */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                Model Parameters
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Temperature ({config.temperature.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => handleTemperatureChange(e.target.value)}
                    className="w-full cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Lower = more deterministic, Higher = more creative
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => handleMaxTokensChange(e.target.value)}
                    min="100"
                    step="100"
                    className="bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground"
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Maximum response length
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {validationStatus !== "idle" && (
              <div
                className={`rounded-lg p-4 flex items-center gap-3 ${
                  validationStatus === "valid"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}
              >
                {validationStatus === "valid" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {validationStatus === "valid"
                    ? "Connection verified"
                    : "Connection failed"}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleTestConnection}
                disabled={!config.apiKey || isTesting}
                variant="outline"
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>

              <Button
                onClick={handleSave}
                disabled={!config.apiKey || isLoading || validationStatus !== "valid"}
                className="flex-1 bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>

              <Button
                onClick={handleClear}
                variant="destructive"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
