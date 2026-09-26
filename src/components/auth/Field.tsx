type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string };

export function Field({ label, name, error, ...rest }: Props) {
    const id = `f-${name}`;
    return (
        <div>
            <label htmlFor={id} className="label">
                {label}
            </label>
            <input
                id={id}
                name={name}
                className="input"
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-err` : undefined}
                {...rest}
            />
            {error && (
                <p id={`${id}-err`} className="field-error">
                    {error}
                </p>
            )}
        </div>
    );
}
